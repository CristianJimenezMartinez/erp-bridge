import { v4 as uuidv4 } from 'uuid';
import { CreateOrganizationDto, Organization } from '@erp-bridge/shared';
import { IOrganizationRepository, PostgresOrganizationRepository } from '../database';

export class OrganizationService {
  constructor(
    private readonly repo: IOrganizationRepository = new PostgresOrganizationRepository()
  ) {}

  public async list(): Promise<Organization[]> {
    return this.repo.listAll();
  }

  public async getById(id: string): Promise<Organization | null> {
    return this.repo.findById(id);
  }

  public async getBySlug(slug: string): Promise<Organization | null> {
    return this.repo.findBySlug(slug);
  }

  public async create(dto: CreateOrganizationDto): Promise<Organization> {
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = `org_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

    const org: Organization = {
      id,
      name: dto.name,
      slug,
      status: 'ACTIVE',
      plan: dto.plan || 'starter',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.repo.create(org);
  }

  public async ensureDefaultOrganization(): Promise<Organization> {
    const defaultSlug = 'default-organization';
    const existing = await this.repo.findBySlug(defaultSlug);
    if (existing) {
      return existing;
    }

    const defaultOrg: Organization = {
      id: 'org_default',
      name: 'Empresa Principal',
      slug: defaultSlug,
      status: 'ACTIVE',
      plan: 'pro',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.repo.create(defaultOrg);
  }
}
