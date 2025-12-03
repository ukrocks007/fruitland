# Docker PostgreSQL Setup Guide

## Prerequisites

- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop))
- Docker Compose (included with Docker Desktop)

## Quick Start

### 1. Start PostgreSQL Container

```bash
npm run docker:up
```

This will:
- Pull PostgreSQL 16 Alpine image (if not already downloaded)
- Create a container named `fruitland-postgres`
- Expose PostgreSQL on port 5432
- Create volume for data persistence

### 2. Run Database Migrations

```bash
npm run db:migrate
```

This creates all tables based on your Prisma schema.

### 3. Seed Initial Data

```bash
npm run db:seed
```

This populates the database with:
- Default tenant
- SUPERADMIN user
- Sample products
- Test users

### 4. All-in-One Setup

```bash
npm run db:setup
```

Runs all steps above in sequence.

## Docker Commands

### Start Database
```bash
npm run docker:up
# or
docker-compose up -d
```

### Stop Database
```bash
npm run docker:down
# or
docker-compose down
```

### View Logs
```bash
npm run docker:logs
# or
docker-compose logs -f postgres
```

### Restart Database
```bash
npm run docker:restart
# or
docker-compose restart postgres
```

## Database Management

### Open Prisma Studio
```bash
npm run db:studio
```

Access at: http://localhost:5555

### Reset Database
```bash
npm run db:reset
```

⚠️ **Warning**: This will delete all data!

### Create New Migration
```bash
npx prisma migrate dev --name your_migration_name
```

## Connection Details

| Property | Value |
|----------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `fruitland_dev` |
| Username | `fruitland` |
| Password | `fruitland123` |
| Connection String | `postgresql://fruitland:fruitland123@localhost:5432/fruitland_dev` |

## Accessing Database

### Using psql (inside container)
```bash
docker exec -it fruitland-postgres psql -U fruitland -d fruitland_dev
```

### Using pgAdmin
1. Download [pgAdmin](https://www.pgadmin.org/download/)
2. Add new server with connection details above

### Using TablePlus / DBeaver
Add new PostgreSQL connection with details above.

## Troubleshooting

### Port Already in Use
If port 5432 is already taken:

1. Check what's using it:
   ```bash
   lsof -i :5432
   ```

2. Stop the service or change port in `docker-compose.yml`:
   ```yaml
   ports:
     - "5433:5432"  # Use 5433 on host
   ```

3. Update DATABASE_URL:
   ```
   postgresql://fruitland:fruitland123@localhost:5433/fruitland_dev
   ```

### Container Won't Start
```bash
# Remove old container
docker-compose down -v

# Rebuild and start
docker-compose up -d --force-recreate
```

### Data Persistence
Data is stored in Docker volume `postgres_data`. To completely remove:
```bash
docker-compose down -v  # -v removes volumes
```

### Connection Refused
```bash
# Check if container is running
docker ps

# Check container logs
docker logs fruitland-postgres

# Ensure health check passes
docker inspect fruitland-postgres | grep Health
```

## Production Notes

- Change default password in production
- Use environment-specific Docker Compose files
- Consider managed PostgreSQL (Vercel Postgres, Supabase, Neon)
- Enable connection pooling for production
- Set up automated backups

## Cleanup

### Stop and Remove Everything
```bash
docker-compose down -v
```

### Remove Images
```bash
docker rmi postgres:16-alpine
```
