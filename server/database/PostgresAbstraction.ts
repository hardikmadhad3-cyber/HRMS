/**
 * PostgreSQL Data Access Abstraction Layer
 * Provides unified interface for relational query execution and repository management.
 * Designed for PostgreSQL compatibility while supporting zero-dependency execution for Phase 0.
 */

export interface QueryOptions {
  companyId?: string;
  limit?: number;
  offset?: number;
}

export interface IDatabaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(options?: QueryOptions): Promise<T[]>;
  create(item: Omit<T, 'id'>): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

/**
 * PostgreSQL Connection & Query Abstraction Interface
 */
export class PostgresDatabaseService {
  private static instance: PostgresDatabaseService;

  private constructor() {}

  public static getInstance(): PostgresDatabaseService {
    if (!PostgresDatabaseService.instance) {
      PostgresDatabaseService.instance = new PostgresDatabaseService();
    }
    return PostgresDatabaseService.instance;
  }

  /**
   * Executes a parameterised SQL query against PostgreSQL interface
   */
  public async query<R = any>(sql: string, params: any[] = []): Promise<{ rows: R[]; rowCount: number }> {
    // Abstraction layer prepared for pg.Pool / ORM adapter
    console.log(`[Postgres abstraction] Executing SQL query: ${sql.slice(0, 80)}...`);
    return { rows: [], rowCount: 0 };
  }
}
