"use client";

import { FormEvent, useEffect, useState } from "react";
import { Company } from "@/lib/types";

type CompaniesResponse = { companies: Company[] };

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sector: "Food Ingredients",
    city: "",
    country: "",
    website: "",
    notes: "",
  });

  async function loadCompanies() {
    const response = await fetch("/api/companies");
    const json = (await response.json()) as CompaniesResponse & { error?: string };
    if (!response.ok) {
      setError(json.error ?? "Failed to load companies");
      return;
    }
    setCompanies(json.companies ?? []);
  }

  useEffect(() => {
    void loadCompanies();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Failed to create company");
      setSaving(false);
      return;
    }
    setForm({
      name: "",
      sector: "Food Ingredients",
      city: "",
      country: "",
      website: "",
      notes: "",
    });
    setSaving(false);
    void loadCompanies();
  }

  async function deleteCompany(id: string) {
    const response = await fetch(`/api/companies/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const json = await response.json();
      setError(json.error ?? "Failed to delete company");
      return;
    }
    void loadCompanies();
  }

  return (
    <div className="stack">
      <section className="page-head">
        <h1>Companies</h1>
        <p>Gestion des entreprises partenaires et fournisseurs.</p>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel stack">
        <h2>Nouvelle entreprise</h2>
        <form className="stack" onSubmit={handleSubmit}>
          <div className="row">
            <label className="col-4 stack">
              Name
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>
            <label className="col-4 stack">
              Sector
              <input
                value={form.sector}
                onChange={(e) => setForm((prev) => ({ ...prev, sector: e.target.value }))}
              />
            </label>
            <label className="col-4 stack">
              City
              <input
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              />
            </label>
            <label className="col-4 stack">
              Country
              <input
                value={form.country}
                onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
              />
            </label>
            <label className="col-4 stack">
              Website
              <input
                value={form.website}
                onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
              />
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
            {saving ? "Saving..." : "Create company"}
          </button>
        </form>
      </section>

      <section className="panel stack">
        <h2>Liste des entreprises</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Sector</th>
              <th>City</th>
              <th>Country</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id}>
                <td>{company.name}</td>
                <td>{company.sector ?? "-"}</td>
                <td>{company.city ?? "-"}</td>
                <td>{company.country ?? "-"}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => void deleteCompany(company.id)}
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
