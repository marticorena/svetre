# Deployment Guide: Horse Genealogy System

Follow these steps to deploy your application to the cloud for free.

## 1. Database (Neon)
**Neon** offers a generous forever-free tier for PostgreSQL.

1. Go to [Neon.tech](https://neon.tech/) and create a free account.
2. Create a new project (e.g., `svetre-db`).
3. Copy the **Connection String** (it starts with `postgresql://...`).
4. Save this string; you'll need it for the Backend setup.

## 2. Backend (Render)
**Render** is great for hosting Node.js applications.

1. Go to [Render.com](https://render.com/) and sign up.
2. Click **New +** > **Web Service**.
3. Connect your GitHub/GitLab repository.
4. Configure the service:
    - **Name**: `svetre-backend`
    - **Root Directory**: `backend`
    - **Environment**: `Node`
    - **Build Command**: `npm install && npm run build`
    - **Start Command**: `npm start`
5. Under **Environment Variables**, add:
    - `DATABASE_URL`: (The connection string from Neon)
6. Click **Create Web Service**.
7. Once deployed, copy the **Service URL** (e.g., `https://svetre-backend.onrender.com`).

## 3. Database Migration & Seeding
Since you are using Prisma, you need to push your schema to the Neon database.

1. Open your terminal in the `backend` folder locally.
2. Temporarily update your local `.env` file's `DATABASE_URL` with the Neon connection string.
3. Run:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
4. *Remember to revert your `.env` if you want to keep working locally with Docker.*

## 4. Frontend (Vercel)
**Vercel** is the best choice for React/Vite applications.

1. Go to [Vercel.com](https://vercel.com/) and sign up.
2. Click **Add New** > **Project**.
3. Import your repository.
4. Configure the project:
    - **Framework Preset**: `Vite` (should be detected automatically)
    - **Root Directory**: `frontend`
5. Under **Environment Variables**, add:
    - `VITE_API_URL`: `https://svetre-backend.onrender.com/graphql` (Replace with your actual Render URL)
6. Click **Deploy**.

---

### Summary of URLs
- **Backend Service**: `https://your-app.onrender.com`
- **Frontend App**: `https://your-app.vercel.app`
