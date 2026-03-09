import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { sendBrevoEmail } from "@/lib/brevo";
import { env } from "@/lib/env";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function canRunJob(request: Request) {
  const cronSecret = request.headers.get("x-cron-secret");
  if (env.cronSecret && cronSecret === env.cronSecret) {
    return true;
  }

  const auth = await requireAuthenticatedUser();
  if (auth.response) return false;
  const role = await getUserRole(auth.user!.id);
  return role === "admin" || role === "commercial";
}

export async function POST(request: Request) {
  const allowed = await canRunJob(request);
  if (!allowed) return fail("Unauthorized to run followup job", 401);

  const { data: stage } = await supabaseAdmin
    .from("pipeline_stages")
    .select("id,name")
    .eq("name", "Devis envoye")
    .single();

  if (!stage) return fail("Stage 'Devis envoye' is missing", 400);

  const threshold = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const { data: leads, error: leadsError } = await supabaseAdmin
    .from("leads")
    .select("id,title,contact_id")
    .eq("current_stage_id", stage.id)
    .eq("status", "open")
    .lt("updated_at", threshold)
    .limit(200);

  if (leadsError) return fail("Failed to load leads for followup", 500, leadsError.message);
  if (!leads || leads.length === 0) return ok({ processed: 0, sent: 0, failed: 0 });

  const { data: template } = await supabaseAdmin
    .from("email_templates")
    .select("id,subject,body")
    .eq("event_type", "followup")
    .eq("is_active", true)
    .single();

  const subject = template?.subject ?? "Relance de votre devis";
  const bodyTpl =
    template?.body ??
    "Bonjour {{name}},\n\nNous revenons vers vous concernant votre devis.\n\nCordialement.";

  let sent = 0;
  let failed = 0;

  for (const lead of leads) {
    if (!lead.contact_id) {
      failed += 1;
      continue;
    }

    const { data: contact } = await supabaseAdmin
      .from("contacts")
      .select("id,first_name,last_name,email")
      .eq("id", lead.contact_id)
      .single();

    if (!contact?.email) {
      failed += 1;
      continue;
    }

    const name = `${contact.first_name} ${contact.last_name}`.trim() || "Client";
    const body = bodyTpl.replaceAll("{{name}}", name);
    const send = await sendBrevoEmail({
      toEmail: contact.email,
      toName: name,
      subject,
      text: body,
    });

    const status = send.ok ? "sent" : "failed";
    if (send.ok) sent += 1;
    else failed += 1;

    await supabaseAdmin.from("email_logs").insert({
      lead_id: lead.id,
      contact_id: contact.id,
      template_id: template?.id ?? null,
      recipient_email: contact.email,
      subject,
      body,
      status,
      provider_message_id: send.ok ? send.messageId ?? null : null,
      error_message: send.ok ? null : send.error ?? "Email send failed",
      sent_at: send.ok ? new Date().toISOString() : null,
    });
  }

  return ok({
    processed: leads.length,
    sent,
    failed,
  });
}
