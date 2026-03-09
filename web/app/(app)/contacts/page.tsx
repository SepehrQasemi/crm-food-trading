"use client";

import { FormEvent, useEffect, useState } from "react";
import { Contact, Company } from "@/lib/types";

type ContactsResponse = { contacts: Contact[] };
type CompaniesResponse = { companies: Company[] };

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    job_title: "",
    company_id: "",
    notes: "",
  });

  async function loadData() {
    const [contactsRes, companiesRes] = await Promise.all([
      fetch("/api/contacts"),
      fetch("/api/companies"),
    ]);
    const contactsJson = (await contactsRes.json()) as ContactsResponse;
    const companiesJson = (await companiesRes.json()) as CompaniesResponse;

    if (!contactsRes.ok) {
      setError((contactsJson as { error?: string }).error ?? "Failed to load contacts");
      return;
    }
    setContacts(contactsJson.contacts ?? []);
    setCompanies(companiesJson.companies ?? []);
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        company_id: form.company_id || null,
      }),
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Failed to create contact");
      setSaving(false);
      return;
    }

    setForm({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      job_title: "",
      company_id: "",
      notes: "",
    });
    setSaving(false);
    void loadData();
  }

  async function deleteContact(id: string) {
    const response = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const json = await response.json();
      setError(json.error ?? "Failed to delete contact");
      return;
    }
    void loadData();
  }

  return (
    <div className="stack">
      <section className="page-head">
        <h1>Contacts</h1>
        <p>Gestion des fiches contacts clients et prospects.</p>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel stack">
        <h2>Nouveau contact</h2>
        <form className="stack" onSubmit={handleSubmit}>
          <div className="row">
            <label className="col-3 stack">
              First name
              <input
                value={form.first_name}
                onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                required
              />
            </label>
            <label className="col-3 stack">
              Last name
              <input
                value={form.last_name}
                onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                required
              />
            </label>
            <label className="col-3 stack">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </label>
            <label className="col-3 stack">
              Phone
              <input
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </label>
            <label className="col-4 stack">
              Job title
              <input
                value={form.job_title}
                onChange={(e) => setForm((prev) => ({ ...prev, job_title: e.target.value }))}
              />
            </label>
            <label className="col-4 stack">
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
            <label className="col-4 stack">
              Notes
              <input
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </label>
          </div>
          <button className="btn btn-primary" disabled={saving} type="submit">
            {saving ? "Saving..." : "Create contact"}
          </button>
        </form>
      </section>

      <section className="panel stack">
        <h2>Liste des contacts</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Company</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.id}>
                <td>
                  {contact.first_name} {contact.last_name}
                </td>
                <td>{contact.email ?? "-"}</td>
                <td>{contact.phone ?? "-"}</td>
                <td>
                  {companies.find((company) => company.id === contact.company_id)?.name ?? "-"}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => void deleteContact(contact.id)}
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
