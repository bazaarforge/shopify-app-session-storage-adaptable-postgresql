import { RdbmsConnection } from '@shopify/shopify-app-session-storage'

export abstract class BasePostgresConnection implements RdbmsConnection {
  sessionStorageIdentifier: string
  protected ready: Promise<void>

  constructor(sessionTableName: string = 'shopify_sessions') {
    this.sessionStorageIdentifier = sessionTableName
  }

  abstract connect(): Promise<void>
  abstract disconnect(): Promise<void>
  abstract query(query: string, params: any[]): Promise<any[]>

  async hasTable(tablename: string): Promise<boolean> {
    await this.ready
    const query = `
      SELECT EXISTS (
        SELECT tablename FROM pg_catalog.pg_tables
          WHERE tablename = ${this.getArgumentPlaceholder(1)}
      )
  `

    // Allow multiple apps to be on the same host with separate DB and querying the right
    // DB for the session table exisitence
    const rows = await this.query(query, [tablename])
    return rows[0].exists
  }

  getArgumentPlaceholder(position: number): string {
    return `$${position}`
  }
}
