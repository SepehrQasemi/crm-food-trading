import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

function ownershipFilter(userId: string) {
  return `owner_id.eq.${userId},assigned_to.eq.${userId}`;
}

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;

  const role = await getUserRole(user.id);
  const isAdmin = role === "admin";

  const leadsQuery = supabaseAdmin
    .from("leads")
    .select("id,status,current_stage_id,estimated_value,owner_id,assigned_to");

  if (!isAdmin) {
    leadsQuery.or(ownershipFilter(user.id));
  }

  const tasksQuery = supabaseAdmin
    .from("tasks")
    .select("id,status,due_date,owner_id,assigned_to");

  if (!isAdmin) {
    tasksQuery.or(ownershipFilter(user.id));
  }

  const emailsQuery = supabaseAdmin
    .from("email_logs")
    .select("id,status,created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const profilesQuery = supabaseAdmin.from("profiles").select("id,full_name");
  const stagesQuery = supabaseAdmin
    .from("pipeline_stages")
    .select("id,name,sort_order")
    .order("sort_order", { ascending: true });

  const [{ data: leads, error: leadsError }, { data: tasks, error: tasksError }, { data: emails, error: emailsError }, { data: profiles }, { data: stages }] =
    await Promise.all([
      leadsQuery,
      tasksQuery,
      emailsQuery,
      profilesQuery,
      stagesQuery,
    ]);

  if (leadsError) return fail("Failed to load leads", 500, leadsError.message);
  if (tasksError) return fail("Failed to load tasks", 500, tasksError.message);
  if (emailsError) return fail("Failed to load email logs", 500, emailsError.message);

  const totalLeads = leads?.length ?? 0;
  const wonLeads = leads?.filter((lead) => lead.status === "won").length ?? 0;
  const lostLeads = leads?.filter((lead) => lead.status === "lost").length ?? 0;
  const conversionRate =
    totalLeads === 0 ? 0 : Number(((wonLeads / totalLeads) * 100).toFixed(2));

  const pipelineValue =
    leads?.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0) ?? 0;

  const now = Date.now();
  const overdueTasks =
    tasks?.filter((task) => {
      if (!task.due_date) return false;
      return task.status !== "done" && new Date(task.due_date).getTime() < now;
    }).length ?? 0;

  const stageCounts: Record<string, number> = {};
  leads?.forEach((lead) => {
    if (!lead.current_stage_id) return;
    stageCounts[lead.current_stage_id] = (stageCounts[lead.current_stage_id] ?? 0) + 1;
  });

  const stageMetrics =
    stages?.map((stage) => ({
      stageId: stage.id,
      stageName: stage.name,
      count: stageCounts[stage.id] ?? 0,
    })) ?? [];

  const salesByCommercial: Record<string, number> = {};
  leads?.forEach((lead) => {
    if (!lead.assigned_to) return;
    const value = Number(lead.estimated_value || 0);
    salesByCommercial[lead.assigned_to] =
      (salesByCommercial[lead.assigned_to] ?? 0) + value;
  });

  const leaderboard = Object.entries(salesByCommercial)
    .map(([userId, amount]) => ({
      userId,
      amount,
      name: profiles?.find((profile) => profile.id === userId)?.full_name ?? "Commercial",
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return ok({
    kpis: {
      totalLeads,
      wonLeads,
      lostLeads,
      conversionRate,
      pipelineValue,
      overdueTasks,
      emailsSent: emails?.filter((email) => email.status === "sent").length ?? 0,
    },
    stageMetrics,
    leaderboard,
  });
}
