"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Lead, PipelineStage } from "@/lib/types";

type LeadResponse = {
  leads: Lead[];
  stages: PipelineStage[];
  contacts: Array<{ id: string; first_name: string; last_name: string; email: string | null }>;
  companies: Array<{ id: string; name: string }>;
};

type MetaResponse = {
  profiles: Array<{ id: string; full_name: string | null; role: string }>;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [contacts, setContacts] = useState<LeadResponse["contacts"]>([]);
  const [companies, setCompanies] = useState<LeadResponse["companies"]>([]);
  const [profiles, setProfiles] = useState<MetaResponse["profiles"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    source: "",
    estimated_value: "",
    contact_id: "",
    company_id: "",
    assigned_to: "",
    notes: "",
  });

  async function loadData() {
    const [leadRes, metaRes] = await Promise.all([fetch("/api/leads"), fetch("/api/meta")]);
    const leadJson = (await leadRes.json()) as LeadResponse & { error?: string };
    const metaJson = (await metaRes.json()) as MetaResponse & { error?: string };

    if (!leadRes.ok) {
      setError(leadJson.error ?? "Failed to load leads");
      return;
    }

    setLeads(leadJson.leads ?? []);
    setStages(leadJson.stages ?? []);
    setContacts(leadJson.contacts ?? []);
    setCompanies(leadJson.companies ?? []);
    setProfiles(metaJson.profiles ?? []);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleCreateLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        estimated_value: Number(form.estimated_value || 0),
        contact_id: form.contact_id || null,
        company_id: form.company_id || null,
        assigned_to: form.assigned_to || null,
      }),
    });

    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Failed to create lead");
      setSaving(false);
      return;
    }

    setForm({
      title: "",
      source: "",
      estimated_value: "",
      contact_id: "",
      company_id: "",
      assigned_to: "",
      notes: "",
    });
    setSaving(false);
    void loadData();
  }

  async function moveLeadStage(leadId: string, stageId: string) {
    const response = await fetch(`/api/leads/${leadId}/stage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage_id: stageId }),
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Failed to move lead");
      return;
    }
    void loadData();
  }

  async function deleteLead(leadId: string) {
    const response = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? "Failed to delete lead");
      return;
    }
    void loadData();
  }

  const grouped = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    stages.forEach((stage) => {
      map[stage.id] = [];
    });
    leads.forEach((lead) => {
      if (!lead.current_stage_id) return;
      if (!map[lead.current_stage_id]) map[lead.current_stage_id] = [];
      map[lead.current_stage_id].push(lead);
    });
    return map;
  }, [leads, stages]);

  return (
    <div className="stack">
      <section className="page-head">
        <h1>Leads & Pipeline</h1>
        <p>Suivi des prospects, du premier contact a la conversion.</p>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel stack">
        <h2>Nouveau lead</h2>
        <form className="stack" onSubmit={handleCreateLead}>
          <div className="row">
            <label className="col-3 stack">
              Title
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                required
              />
            </label>
            <label className="col-3 stack">
              Source
              <input
                value={form.source}
                onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
                placeholder="Salon, LinkedIn, Referral..."
              />
            </label>
            <label className="col-3 stack">
              Estimated value
              <input
                type="number"
                value={form.estimated_value}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, estimated_value: e.target.value }))
                }
              />
            </label>
            <label className="col-3 stack">
              Contact
              <select
                value={form.contact_id}
                onChange={(e) => setForm((prev) => ({ ...prev, contact_id: e.target.value }))}
              >
                <option value="">No contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-3 stack">
              Company
              <select
                value={form.company_id}
                onChange={(e) => setForm((prev) => ({ ...prev, company_id: e.target.value }))}
              >
                <option value="">No company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-3 stack">
              Assigned to
              <select
                value={form.assigned_to}
                onChange={(e) => setForm((prev) => ({ ...prev, assigned_to: e.target.value }))}
              >
                <option value="">Auto assign</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.full_name ?? profile.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-6 stack">
              Notes
              <input
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Create lead"}
          </button>
        </form>
      </section>

      <section className="panel stack">
        <h2>Pipeline board</h2>
        <div className="board">
          {stages.map((stage) => (
            <article key={stage.id} className="stage">
              <h3>{stage.name}</h3>
              <p className="small">Leads: {grouped[stage.id]?.length ?? 0}</p>
              {(grouped[stage.id] ?? []).map((lead) => (
                <div key={lead.id} className="lead-card stack">
                  <strong>{lead.title}</strong>
                  <span className="small">
                    {lead.estimated_value?.toLocaleString?.() ?? 0} €
                  </span>
                  <select
                    value={lead.current_stage_id ?? ""}
                    onChange={(e) => void moveLeadStage(lead.id, e.target.value)}
                  >
                    {stages.map((targetStage) => (
                      <option key={targetStage.id} value={targetStage.id}>
                        {targetStage.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-danger"
                    type="button"
                    onClick={() => void deleteLead(lead.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
