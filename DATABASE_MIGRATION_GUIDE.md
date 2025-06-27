# SQLite to Production Database Migration Guide

## Overview
Your LocalPick application currently uses SQLite, which works great for development but has limitations in cloud environments like Render. This guide outlines migration strategies for production deployment.

## Why Migrate from SQLite?

### SQLite Limitations on Render:
- **No Persistent Storage**: Render's ephemeral filesystem means SQLite data is lost on deployments
- **Single Connection**: SQLite doesn't handle concurrent connections well
- **No Clustering**: Can't scale across multiple instances
- **Limited Backup Options**: No built-in backup/restore capabilities

## Migration Options

### Option 1: PostgreSQL on Render (Recommended)
**Best for**: Production applications requiring reliability and scalability

```bash
# 1. Add Render PostgreSQL service to render.yaml
services:
  - type: postgres
    name: localpick-db
    databaseName: localpick
    user: localpick_user
    plan: starter  # Free tier available
```

**Migration Steps:**
1. Update `drizzle.config.ts` for PostgreSQL
2. Install PostgreSQL adapter: `npm install pg @types/pg`
3. Update database connection in `server/db/index.ts`
4. Run migration: `npm run db:push`

### Option 2: Supabase (Managed PostgreSQL)
**Best for**: Applications needing auth, real-time features, and managed database

```typescript
// Update server/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client);
```

### Option 3: PlanetScale (MySQL)
**Best for**: Applications needing serverless scaling and branching

```bash
npm install @planetscale/database
```

### Option 4: Keep SQLite with Persistent Disk
**Best for**: Simple applications with light usage

**Pros:**
- Minimal code changes
- Fast local development
- Lower costs

**Cons:**
- Limited to 1GB on free tier
- No automatic backups
- Single instance only

**Implementation:**
```yaml
# Already configured in render.yaml
disk:
  name: sqlite-data
  mountPath: /opt/render/project/src/data
  sizeGB: 1
```

## Migration Checklist

### Pre-Migration
- [ ] Export current SQLite data: `sqlite3 database.db .dump > backup.sql`
- [ ] Test new database connection locally
- [ ] Update environment variables
- [ ] Test all API endpoints with new database

### Database Schema Migration
```bash
# 1. Update drizzle config for new database
# 2. Generate new migration
npx drizzle-kit generate:pg  # for PostgreSQL
npx drizzle-kit generate:mysql  # for MySQL

# 3. Push schema to new database
npm run db:push
```

### Code Changes Required

#### 1. Database Connection (`server/db/index.ts`)
```typescript
// PostgreSQL example
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client);

// Run migrations on startup
if (process.env.NODE_ENV === 'production') {
  await migrate(db, { migrationsFolder: './drizzle' });
}
```

#### 2. Update Environment Variables
```bash
# PostgreSQL
DATABASE_URL=postgresql://user:password@host:port/database

# Supabase
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

# PlanetScale
DATABASE_URL=mysql://[USERNAME]:[PASSWORD]@[HOST]/[DATABASE]?ssl={"rejectUnauthorized":true}
```

### 3. Data Migration Script
```typescript
// scripts/migrate-data.ts
import { db as oldDb } from '../server/db/sqlite';
import { db as newDb } from '../server/db/postgres';
import * as schema from '../shared/schema';

async function migrateData() {
  // Export from SQLite
  const shops = await oldDb.select().from(schema.shops);
  const products = await oldDb.select().from(schema.products);
  const customers = await oldDb.select().from(schema.customers);
  
  // Import to new database
  await newDb.insert(schema.shops).values(shops);
  await newDb.insert(schema.products).values(products);
  await newDb.insert(schema.customers).values(customers);
  
  console.log('Migration completed!');
}
```

## Production Database Best Practices

### 1. Connection Pooling
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 2. Database Backups
- **Render PostgreSQL**: Automatic daily backups included
- **Supabase**: Point-in-time recovery available
- **Manual**: Set up cron jobs for regular exports

### 3. Monitoring
```typescript
// Add database health check
app.get('/api/health/db', async (req, res) => {
  try {
    await db.execute('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});
```

## Recommended Migration Path

1. **Development**: Continue using SQLite locally
2. **Staging**: Deploy with Render PostgreSQL (free tier)
3. **Production**: Upgrade to paid PostgreSQL or use Supabase

## Testing Your Migration

```bash
# 1. Test locally with new database
DATABASE_URL=postgresql://localhost:5432/test npm run dev

# 2. Run integration tests
npm test

# 3. Load test critical endpoints
# Use tools like Artillery or k6

# 4. Deploy to staging environment
git push origin staging
```

## Rollback Plan

1. Keep SQLite backup file
2. Document current schema version
3. Have rollback script ready:

```bash
# Emergency rollback
sqlite3 database.db < backup.sql
git revert <commit-hash>
```

## Cost Considerations

| Option | Free Tier | Paid Plans | Best For |
|--------|-----------|------------|----------|
| Render PostgreSQL | 90 days | $7/month | Simple apps |
| Supabase | 500MB | $25/month | Full-stack with auth |
| PlanetScale | 1 database | $29/month | High performance |
| SQLite + Disk | 1GB storage | $0.10/GB | Minimal apps |

## Support and Troubleshooting

### Common Issues:
1. **Connection timeouts**: Increase connection pool size
2. **Migration failures**: Run migrations in smaller batches
3. **Data type mismatches**: Review schema differences between databases

### Getting Help:
- Render Support: https://render.com/docs
- Drizzle Docs: https://orm.drizzle.team/
- Database-specific documentation