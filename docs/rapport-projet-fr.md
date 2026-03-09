# Rapport Projet CRM (Version FR)

## 1. Contexte et besoin
L entreprise cible est une societe de negoce en matieres premieres alimentaires.  
Le besoin principal est de centraliser les prospects, structurer le cycle de vente, automatiser les relances et visualiser les KPIs commerciaux.

## 2. Objectifs
- Construire un CRM web full SaaS (sans serveur a gerer)
- Organiser le suivi lead -> client
- Automatiser les emails de bienvenue et de relance 72h
- Fournir un dashboard KPI pour les decisions commerciales

## 3. Choix techniques
- Frontend/API: Next.js 16
- Base relationnelle + Auth + RLS: Supabase PostgreSQL
- Emailing: Brevo API
- Deployment: Vercel
- Versioning: GitHub

## 4. Modules implementes
### 4.1 Utilisateurs & roles
- Authentification: login, signup, reset password
- Roles: admin, commercial, standard_user
- RLS active sur les tables metier

### 4.2 Contacts
- Creation / consultation / suppression
- Association a une entreprise
- Champs: nom, email, telephone, poste, notes

### 4.3 Entreprises
- Gestion des partenaires et clients B2B
- Champs: secteur, ville, pays, site web, notes

### 4.4 Leads
- CRUD leads avec valeur estimee
- Assignation a un commercial
- Liaison contact/entreprise

### 4.5 Pipeline & funnel
Pipeline metier retenu:
1. Nouveau lead
2. Qualification
3. Echantillon envoye
4. Devis envoye
5. Negociation
6. Gagne
7. Perdu

- Visualisation en board par etapes
- Changement d etape avec historique (`lead_stage_history`)

### 4.6 Taches
- Creation des rappels/appels/rendez-vous
- Priorites, echeance, statut
- Suivi des retards (overdue)

### 4.7 Emails & automatisation
- Envoi manuel d emails via API
- Template "welcome" a l arrivee d un lead
- Job "followup" automatique a 72h si lead bloque en "Devis envoye"
- Journal complet des envois et erreurs (`email_logs`)

### 4.8 Dashboard analytique
- Nombre total de leads
- Leads gagnes/perdus
- Taux de conversion
- Valeur pipeline
- Taches en retard
- Volume d emails envoyes
- Pipeline par etape + mini leaderboard commerciaux

## 5. Modele de donnees (resume)
Tables principales:
- `profiles`
- `companies`
- `contacts`
- `pipeline_stages`
- `leads`
- `lead_stage_history`
- `tasks`
- `email_templates`
- `email_logs`

Contraintes:
- cles etrangeres sur les entites metier
- checks sur role/status/priority
- indexes sur les champs de recherche et de suivi

## 6. API REST
Routes principales:
- `/api/contacts`
- `/api/companies`
- `/api/leads`
- `/api/leads/:id/stage`
- `/api/tasks`
- `/api/dashboard`
- `/api/emails/send`
- `/api/emails/logs`
- `/api/jobs/followup`

## 7. Securite
- Auth Supabase avec session JWT
- RLS active sur les tables
- Filtrage proprietaire/assignee pour les non-admins
- Service role uniquement cote serveur

## 8. Tests de validation
- Build TypeScript: OK
- Lint: OK
- Migrations poussees sur Supabase: OK
- Parcours de demonstration prepare:
  - Creation entreprise + contact
  - Creation lead
  - Deplacement pipeline
  - Creation tache
  - Envoi email + log
  - Lecture dashboard

## 9. Limites actuelles et pistes
- Edition inline avancee des entites (v2)
- Notifications temps reel (v2)
- Exports PDF/CSV (v2)
- Docker dev env (bonus)

## 10. Conclusion
Le projet livre un CRM full SaaS coherent avec l enonce, techniquement deployable et pedagogiquement aligné avec les objectifs MIAGE/Communication Digitale.
