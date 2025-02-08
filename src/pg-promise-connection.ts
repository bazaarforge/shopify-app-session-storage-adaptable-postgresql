import { BasePostgresConnection } from './base-postgres-connection.js'
import { IBaseProtocol } from 'pg-promise'

export class PgPromiseConnection extends BasePostgresConnection {
  private db: IBaseProtocol<any>
  constructor(pgPromise: IBaseProtocol<any>, sessionTableName?: string) {
    super(sessionTableName)
    this.db = pgPromise
    this.ready = new Promise<void>((resolve) => resolve())
  }

  async query(query: string, params: any[] = []): Promise<any[]> {
    return this.db.query(query, params)
  }
  async connect(): Promise<void> {
    // No-op since pg-promise handles connections
    return Promise.resolve()
  }

  async disconnect(): Promise<void> {
    // No-op since pg-promise handles connections
    return Promise.resolve()
  }
}
