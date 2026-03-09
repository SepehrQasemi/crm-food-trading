import { requireAuthenticatedUser } from "@/lib/auth";
import { sendBrevoEmail } from "@/lib/brevo";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

function renderTemplate(template: string, name: string) {
  return template.replaceAll("{{name}}", name || "Client");
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;

  const body = await request.json();
  const leadId = body.lead_id ? String(body.lead_id) : null;
  const templateId = body.template_id ? String(body.template_id) : null;
  const eventType = body.event_type ? String(body.event_type) : "custom";

  if (!leadId && !body.recipient_email) {
    return fail("lead_id or recipient_email is required", 400);
  }

  const { data: template } = templateId
    ? await supabaseAdmin
        .from("email_templates")
        .select("id,name,event_type,subject,body")
        .eq("id", templateId)
        .single()
    : await supabaseAdmin
        .from("email_templates")
        .select("id,name,event_type,subject,body")
        .eq("event_type", eventType)
        .eq("is_active", true)
        .limit(1)
        .single();

  let recipientEmail = body.recipient_email ? String(body.recipient_email) : null;
  let recipientName = "Client";
  let contactId: string | null = null;

  if (leadId) {
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("id,contact_id,title")
      .eq("id", leadId)
      .single();

    if (!lead) return fail("Lead not found", 404);

    if (lead.contact_id) {
      const { data: contact } = await supabaseAdmin
        .from("contacts")
        .select("id,first_name,last_name,email")
        .eq("id", lead.contact_id)
        .single();

      if (contact?.email) {
        recipientEmail = contact.email;
        recipientName = `${contact.first_name} ${contact.last_name}`.trim();
        contactId = contact.id;
      }
    }
  }

  if (!recipientEmail) return fail("Recipient email not found", 400);

  const subject = body.subject
    ? String(body.subject)
    : template?.subject ?? "CRM Notification";
  const bodyText = body.body
    ? String(body.body)
    : renderTemplate(template?.body ?? "Bonjour {{name}}", recipientName);

  const sent = await sendBrevoEmail({
    toEmail: recipientEmail,
    toName: recipientName,
    subject,
    text: bodyText,
  });

  const status = sent.ok ? "sent" : "failed";

  const { data: log, error: logError } = await supabaseAdmin
    .from("email_logs")
    .insert({
      lead_id: leadId,
      contact_id: contactId,
      template_id: template?.id ?? null,
      recipient_email: recipientEmail,
      subject,
      body: bodyText,
      status,
      provider_message_id: sent.ok ? sent.messageId ?? null : null,
      error_message: sent.ok ? null : sent.error ?? "Unknown email error",
      sent_at: sent.ok ? new Date().toISOString() : null,
    })
    .select(
      "id,recipient_email,subject,status,provider_message_id,error_message,created_at,sent_at",
    )
    .single();

  if (logError) return fail("Email send result logged failed", 500, logError.message);

  return ok({
    sent: sent.ok,
    log,
    provider: sent.payload ?? null,
    error: sent.ok ? null : sent.error,
  });
}
