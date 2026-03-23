# Pedigree App - Backend

This is the backend for the Horse Genealogy System. It uses Node.js, Express, Apollo Server (GraphQL), and PostgreSQL with Prisma ORM.

## Setup Instructions

1. **Environment Variables**:
   A `.env` file should be present in this directory with the following content:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/pedigree?schema=public"
   ```
   *(Note: The root `docker-compose.yml` runs Postgres on port 5433 to avoid port conflicts).*

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Database Setup**:
   Ensure your PostgreSQL database is running, then push the schema and run the seed script:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   The GraphQL server will be available at [http://localhost:4000/graphql](http://localhost:4000/graphql).
