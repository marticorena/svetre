# Horse Genealogy System

A highly interactive pedigree tree visualization app built with React Flow, GraphQL, Node.js, and PostgreSQL.

## Quick Start (Docker Compose)

To start the entire application (Database, Backend API, and Frontend web interface) in an isolated containerized environment:

```bash
docker compose up --build
```
- The frontend will be accessible at: `http://localhost:8080`
- The backend API will be available at: `http://localhost:4000/graphql`

## Manual Local Development
If you prefer running the components individually to edit code locally:
1. **Database**: `docker compose up -d postgres`
2. **Backend**: Navigate to `./backend`, run `npm install`, apply migrations `npx prisma db push`, seed Db `npx prisma db seed`, and start API `npm run dev`.
3. **Frontend**: Navigate to `./frontend`, run `npm install` and start web server `npm run dev`.

## Deployment
For instructions on how to deploy this application to free-tier cloud services (Neon, Render, Vercel), see [DEPLOYMENT.md](./DEPLOYMENT.md).
