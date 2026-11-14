import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface DatabaseStatus {
  connected: boolean;
  provider: 'PostgreSQL_PostGIS' | 'Local_Transactional_Store';
  status: 'ONLINE' | 'AWAITING_CREDENTIALS' | 'OFFLINE' | 'MIGRATING';
  currentVersion: number;
  error?: string;
}

export class PostgresService {
  private pool: pg.Pool | null = null;
  private status: DatabaseStatus = {
    connected: false,
    provider: 'Local_Transactional_Store',
    status: 'AWAITING_CREDENTIALS',
    currentVersion: 0,
  };

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      try {
        this.pool = new Pool({
          connectionString,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });
      } catch (err: any) {
        this.status = {
          connected: false,
          provider: 'Local_Transactional_Store',
          status: 'OFFLINE',
          currentVersion: 0,
          error: err.message,
        };
      }
    } else {
      this.status = {
        connected: false,
        provider: 'Local_Transactional_Store',
        status: 'AWAITING_CREDENTIALS',
        currentVersion: 0,
        error: 'DATABASE_URL environment variable is not defined.',
      };
    }
  }

  public getStatus(): DatabaseStatus {
    return { ...this.status };
  }

  public isAvailable(): boolean {
    return this.status.connected && this.pool !== null;
  }

  public async initAndMigrate(): Promise<DatabaseStatus> {
    if (!this.pool) {
      return this.status;
    }

    try {
      this.status.status = 'MIGRATING';
      const client = await this.pool.connect();
      try {
        // Run migration files in server/db/migrations
        const migrationsDir = path.resolve(__dirname, 'migrations');
        const files = await fs.readdir(migrationsDir);
        const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();

        for (const file of sqlFiles) {
          const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');
          await client.query(sql);
        }

        const res = await client.query('SELECT MAX(version) as max_version FROM schema_migrations');
        const maxVersion = res.rows[0]?.max_version || 1;

        this.status = {
          connected: true,
          provider: 'PostgreSQL_PostGIS',
          status: 'ONLINE',
          currentVersion: Number(maxVersion),
        };
      } finally {
        client.release();
      }
    } catch (err: any) {
      this.status = {
        connected: false,
        provider: 'Local_Transactional_Store',
        status: 'OFFLINE',
        currentVersion: 0,
        error: `PostgreSQL connection failed: ${err.message}`,
      };
    }

    return this.status;
  }

  public async query<T extends pg.QueryResultRow = any>(sql: string, params?: any[]): Promise<pg.QueryResult<T>> {
    if (!this.pool || !this.status.connected) {
      throw new Error(`PostgreSQL unavailable: ${this.status.error || 'Not connected'}`);
    }
    return this.pool.query<T>(sql, params);
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.status.connected = false;
    }
  }
}

export const postgresService = new PostgresService();
