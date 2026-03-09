"use client";

import { FormEvent, useEffect, useState } from "react";
import { Lead } from "@/lib/types";

type MetaResponse = {
  templates: Array<{ id: string; name: string; event_type: string; subject: string; is_active: boolean }>;
};

type LeadsResponse = { leads: Lead[] };
type LogsResponse = {
  logs: Array<{
    id: string;
    recipient_email: string;
    subject: string;
    status: string;
    created_at: string;
    sent_at: string | null;
    error_message: string | null;
  }>;
};

export default function EmailsPage() {
  const [templates, setTemplates] = useState<MetaResponse["templates"]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [logs, setLogs] = useState<LogsResponse["logs"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [runningJob, setRunningJob] = useState(false);
  const [form, setForm] = useState({
    lead_id: "",
    template_id: "",
    recipient_email: "",
    subject: "",
    body: "",
  });

  async function loadData() {
    const [metaRes, leadRes, logsRes] = await Promise.all([
      fetch("/api/meta"),
      fetch("/api/leads"),
      fetch("/api/emails/logs"),
    ]);

    const metaJson = (await metaRes.json()) as MetaResponse & { error?: string };
    const leadJson = (await leadRes.json()) as LeadsResponse & { error?: string };
    const logsJson = (await logsRes.json()) as LogsResponse & { error?: string };

    if (!logsRes.ok) {
      setError(logsJson.error ?? "Failed to load email logs");
      return;
    }
    setTemplates(metaJson.templates ?? []);
    setLeads(leadJson.leads ?? []);
    setLogs(logsJson.logs ?? []);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/emails/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        lead_id: form.lead_id || null,
        template_id: form.template_id || null,
        recipient_email: form.recipient_email || null,
        subject: form.subject || null,
        body: form.body || null,
      }),
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Failed to send email");
      setSending(false);
      return;
    }
    setSuccess(json.sent ? "Email sent successfully" : "Email logged as failed");
    setSending(false);
    setForm({
      lead_id: "",
      template_id: "",
      recipient_email: "",
      subject: "",
      body: "",
    });
    void loadData();
  }

  async function runFollowupJob() {
    setRunningJob(true);
    setError(null);
    setSuccess(null);
    const response = await fetch("/api/jobs/followup", { method: "POST" });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Follow-up job failed");
      setRunningJob(false);
      return;
    }
    setSuccess(`Follow-up job done: ${json.sent} sent / ${json.failed} failed`);
    setRunningJob(false);
    void loadData();
  }

  return (
    <div className="stack">
      <section className="page-head">
        <h1>Email Automation</h1>
        <p>Envois manuels, journal des emails et relance automatique 72h.</p>
      </section>

      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success">{success}</p> : null}

      <section className="panel stack">
        <div className="row">
          <div className="col-6">
            <h2>Envoyer un email</h2>
          </div>
          <div className="col-6" style={{ textAlign: "right" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void runFollowupJob()}
              disabled={runningJob}
            >
              {runningJob ? "Running..." : "Run follow-up 72h"}
            </button>
          </div>
        </div>

        <form className="stack" onSubmit={handleSend}>
          <div className="row">
            <label className="col-4 stack">
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
            <label className="col-4 stack">
              Template
              <select
                value={form.template_id}
                onChange={(e) => setForm((prev) => ({ ...prev, template_id: e.target.value }))}
              >
                <option value="">Auto by event</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.event_type})
                  </option>
                ))}
              </select>
            </label>
            <label className="col-4 stack">
              Recipient email (optional)
              <input
                type="email"
                value={form.recipient_email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, recipient_email: e.target.value }))
                }
              />
            </label>
            <label className="col-6 stack">
              Subject (optional)
              <input
                value={form.subject}
                onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
              />
            </label>
            <label className="col-6 stack">
              Body (optional)
              <textarea
                value={form.body}
                onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              />
            </label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={sending}>
            {sending ? "Sending..." : "Send email"}
          </button>
        </form>
      </section>

      <section className="panel stack">
        <h2>Email logs</h2>
        <table>
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Created</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.recipient_email}</td>
                <td>{log.subject}</td>
                <td>{log.status}</td>
                <td>{new Date(log.created_at).toLocaleString()}</td>
                <td>{log.error_message ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
