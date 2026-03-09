"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Lead, Task } from "@/lib/types";

type TasksResponse = { tasks: Task[] };
type LeadsResponse = { leads: Lead[] };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    due_date: "",
    priority: "normal",
    lead_id: "",
  });

  async function loadData() {
    const [taskRes, leadRes] = await Promise.all([fetch("/api/tasks"), fetch("/api/leads")]);
    const taskJson = (await taskRes.json()) as TasksResponse & { error?: string };
    const leadJson = (await leadRes.json()) as LeadsResponse & { error?: string };

    if (!taskRes.ok) {
      setError(taskJson.error ?? "Failed to load tasks");
      return;
    }
    setTasks(taskJson.tasks ?? []);
    setLeads(leadJson.leads ?? []);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        lead_id: form.lead_id || null,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      }),
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Failed to create task");
      setSaving(false);
      return;
    }
    setForm({
      title: "",
      description: "",
      due_date: "",
      priority: "normal",
      lead_id: "",
    });
    setSaving(false);
    void loadData();
  }

  async function markDone(taskId: string) {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    if (!response.ok) {
      const json = await response.json();
      setError(json.error ?? "Failed to update task");
      return;
    }
    void loadData();
  }

  async function deleteTask(taskId: string) {
    const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (!response.ok) {
      const json = await response.json();
      setError(json.error ?? "Failed to delete task");
      return;
    }
    void loadData();
  }

  const overdueCount = useMemo(() => {
    const now = Date.now();
    return tasks.filter(
      (task) => task.status !== "done" && task.due_date && new Date(task.due_date).getTime() < now,
    ).length;
  }, [tasks]);

  return (
    <div className="stack">
      <section className="page-head">
        <h1>Tasks & Calendar</h1>
        <p>Planification des appels, rendez-vous et rappels commerciaux.</p>
      </section>

      <section className="card-grid">
        <article className="card">
          <p className="muted">Total tasks</p>
          <p className="kpi">{tasks.length}</p>
        </article>
        <article className="card">
          <p className="muted">Overdue</p>
          <p className="kpi">{overdueCount}</p>
        </article>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel stack">
        <h2>Nouvelle tache</h2>
        <form className="stack" onSubmit={handleSubmit}>
          <div className="row">
            <label className="col-4 stack">
              Title
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </label>
            <label className="col-4 stack">
              Due date
              <input
                type="datetime-local"
                value={form.due_date}
                onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
              />
            </label>
            <label className="col-4 stack">
              Priority
              <select
                value={form.priority}
                onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label className="col-6 stack">
              Lead
              <select
                value={form.lead_id}
                onChange={(e) => setForm((prev) => ({ ...prev, lead_id: e.target.value }))}
              >
                <option value="">No lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-6 stack">
              Description
              <input
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Create task"}
          </button>
        </form>
      </section>

      <section className="panel stack">
        <h2>Task list</h2>
        <table>
          <thead>
            <tr>
              <th>Task</th>
              <th>Due</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Lead</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>{task.title}</td>
                <td>{task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd HH:mm") : "-"}</td>
                <td>{task.priority}</td>
                <td>{task.status}</td>
                <td>{leads.find((lead) => lead.id === task.lead_id)?.title ?? "-"}</td>
                <td>
                  {task.status !== "done" && (
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => void markDone(task.id)}
                    >
                      Mark done
                    </button>
                  )}{" "}
                  <button
                    className="btn btn-danger"
                    type="button"
                    onClick={() => void deleteTask(task.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
