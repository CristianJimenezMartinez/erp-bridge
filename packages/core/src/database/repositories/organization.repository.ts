import { Organization } from '@erp-bridge/shared';
import { DatabaseService } from '../database.service';

export interface IOrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  create(org: Organization): Promise<Organization>;
  listAll(): Promise<Organization[]>;
}

export class PostgresOrganizationRepository implements IOrganizationRepository {
  constructor(private db: DatabaseService = DatabaseService.getInstance()) {}

  async findById(id: string): Promise<Organization | null> {
    const res = await this.db.query(
      `SELECT id, name, slug, status, plan, created_at, updated_at 
       FROM organizations 
       WHERE id = $1`,
      [id]
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row['id'] as string,
      name: row['name'] as string,
      slug: row['slug'] as string,
      status: row['status'] as Organization['status'],
      plan: row['plan'] as string,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const res = await this.db.query(
      `SELECT id, name, slug, status, plan, created_at, updated_at 
       FROM organizations 
       WHERE slug = $1`,
      [slug]
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row['id'] as string,
      name: row['name'] as string,
      slug: row['slug'] as string,
      status: row['status'] as Organization['status'],
      plan: row['plan'] as string,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }

  async create(org: Organization): Promise<Organization> {
    await this.db.query(
      `INSERT INTO organizations (id, name, slug, status, plan, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE 
       SET name = $2, slug = $3, status = $4, plan = $5, updated_at = $7`,
      [org.id, org.name, org.slug, org.status, org.plan, org.createdAt, org.updatedAt]
    );
    return org;
  }

  async listAll(): Promise<Organization[]> {
    const res = await this.db.query(
      `SELECT id, name, slug, status, plan, created_at, updated_at 
       FROM organizations 
       ORDER BY created_at DESC`
    );
    return res.rows.map((row) => ({
      id: row['id'] as string,
      name: row['name'] as string,
      slug: row['slug'] as string,
      status: row['status'] as Organization['status'],
      plan: row['plan'] as string,
      createdAt: new Date(row['created_at']),
      updatedAt: new Date(row['updated_at']),
    }));
  }
}
