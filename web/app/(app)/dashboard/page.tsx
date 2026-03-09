"use client";

import { useEffect, useState } from "react";

type DashboardResponse = {
  kpis: {
    totalLeads: number;
    wonLeads: number;
    lostLeads: number;
    conversionRate: number;
    pipelineValue: number;
    overdueTasks: number;
    emailsSent: number;
  };
  stageMetrics: Array<{ stageId: string; stageName: string; count: number }>;
  leaderboard: Array<{ userId: string; amount: number; name: string }>;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setError(null);
    const response = await fetch("/api/dashboard");
    const json = await response.json();
    if (!response.ok) {
      setError(json.error ?? "Failed to load dashboard");
      return;
    }
    setData(json);
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  return (
    <div className="stack">
      <section className="page-head">
        <h1>Dashboard</h1>
        <p>KPIs commerciaux, suivi pipeline et performance de l equipe.</p>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="card-grid">
        <article className="card">
          <p className="muted">Total leads</p>
          <p className="kpi">{data?.kpis.totalLeads ?? 0}</p>
        </article>
        <article className="card">
          <p className="muted">Conversion</p>
          <p className="kpi">{data?.kpis.conversionRate ?? 0}%</p>
        </article>
        <article className="card">
          <p className="muted">Pipeline value</p>
          <p className="kpi">{(data?.kpis.pipelineValue ?? 0).toLocaleString()} €</p>
        </article>
        <article className="card">
          <p className="muted">Tasks overdue</p>
          <p className="kpi">{data?.kpis.overdueTasks ?? 0}</p>
        </article>
      </section>

      <section className="panel stack">
        <h2>Pipeline par etape</h2>
        <table>
          <thead>
            <tr>
              <th>Etape</th>
              <th>Leads</th>
            </tr>
          </thead>
          <tbody>
            {(data?.stageMetrics ?? []).map((stage) => (
              <tr key={stage.stageId}>
                <td>{stage.stageName}</td>
                <td>{stage.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel stack">
        <h2>Leaderboard commerciaux</h2>
        <table>
          <thead>
            <tr>
              <th>Commercial</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            {(data?.leaderboard ?? []).map((entry) => (
              <tr key={entry.userId}>
                <td>{entry.name}</td>
                <td>{entry.amount.toLocaleString()} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
