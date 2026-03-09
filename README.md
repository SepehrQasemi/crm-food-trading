# CRM Food Trading

Projet CRM full SaaS pour une entreprise de negoce en matieres premieres alimentaires.

## Structure
- `supabase/`: migrations SQL, config Supabase
- `web/`: application Next.js (frontend + API routes)
- `docs/`: rapport et diagrammes

## Prerequis
- Node.js + npm
- Supabase CLI (linked project)
- Vercel CLI (pour deploy)

## Setup
1. Copier les secrets:
   - source: `C:\dev\crm-secrets.env`
   - destination: `web/.env.local`
2. Installer deps:
```bash
cd web
npm install
```
3. Appliquer la base:
```bash
cd ..
npx -y supabase@latest db push
```
4. Lancer en local:
```bash
cd web
npm run dev
```

## Scripts de qualite
```bash
cd web
npm run lint
npm run build
```

## Deploiement
- Web app: Vercel (import repo GitHub, root = `web`)
- Base: Supabase project linked (`vynlbsdvnwqxbbkxssnx`)

## Livrables inclus
- CRM operationnel (auth, contacts, companies, leads, pipeline, tasks, email, dashboard)
- APIs REST serverless
- Migrations SQL + policies RLS
- Rapport FR complet + resume FA
