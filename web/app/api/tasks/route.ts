import { getUserRole, requireAuthenticatedUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ownershipFilter = (userId: string) => `owner_id.eq.${userId},assigned_to.eq.${userId}`;

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;
  const role = await getUserRole(user.id);
  const isAdmin = role === "admin";

  const query = supabaseAdmin
    .from("tasks")
    .select(
      "id,title,description,due_date,priority,status,assigned_to,lead_id,company_id,contact_id,created_at,owner_id",
    )
    .order("due_date", { ascending: true, nullsFirst: false });

  if (!isAdmin) query.or(ownershipFilter(user.id));

  const { data, error } = await query;
  if (error) return fail("Failed to load tasks", 500, error.message);
  return ok({ tasks: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;
  const user = auth.user!;
  const body = await request.json();

  if (!body.title) return fail("title is required", 400);

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .insert({
      title: String(body.title),
      description: body.description ? String(body.description) : null,
      due_date: body.due_date ? new Date(body.due_date).toISOString() : null,
      priority: body.priority ? String(body.priority) : "normal",
      status: body.status ? String(body.status) : "todo",
      assigned_to: body.assigned_to ? String(body.assigned_to) : user.id,
      lead_id: body.lead_id ? String(body.lead_id) : null,
      company_id: body.company_id ? String(body.company_id) : null,
      contact_id: body.contact_id ? String(body.contact_id) : null,
      owner_id: user.id,
    })
    .select(
      "id,title,description,due_date,priority,status,assigned_to,lead_id,company_id,contact_id,created_at",
    )
    .single();

  if (error) return fail("Failed to create task", 500, error.message);
  return ok({ task: data }, 201);
}
