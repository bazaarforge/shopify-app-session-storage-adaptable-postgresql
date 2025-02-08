import pg from 'pg'
import { BasePostgresConnection } from './base-postgres-connection.js'

export class NativePostgresConnection extends BasePostgresConnection {
  static withCredentials(
    host: string,
    dbName: string,
    username: string,
    password: string,
    sessionTableName: string,
  ) {
    const url = `postgres://${encodeURIComponent(username)}:${encodeURIComponent(
      password,
    )}@${host}/${encodeURIComponent(dbName)}`
    return new NativePostgresConnection(url, sessionTableName)
  }

  private pool: pg.Pool
  private dbUrl: URL

  constructor(dbUrl: string, sessionTableName?: string) {
    super(sessionTableName)
    this.dbUrl = new URL(dbUrl)
    this.ready = this.init()
  }

  async query(query: string, params: any[] = []): Promise<any[]> {
    await this.ready
    return (await this.pool.query(query, params)).rows
  }

  async disconnect(): Promise<void> {
    // Since no longer using individual client, use disconnect to reset the pool.
    await this.ready
    await this.pool.end()
    this.ready = this.init()
  }

  async connect(): Promise<void> {
    await this.ready
  }

  public getDatabase(): string | undefined {
    return decodeURIComponent(this.dbUrl.pathname.slice(1))
  }

  private async init(): Promise<void> {
    this.pool = new pg.Pool({
      host: this.dbUrl.hostname,
      user: decodeURIComponent(this.dbUrl.username),
      password: decodeURIComponent(this.dbUrl.password),
      database: this.getDatabase(),
      port: Number(this.dbUrl.port),
    })
  }
}
