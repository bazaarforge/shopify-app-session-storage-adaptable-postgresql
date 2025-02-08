import { Session } from '@shopify/shopify-api'
import { SessionStorage } from '@shopify/shopify-app-session-storage'

import { BasePostgresConnection } from './base-postgres-connection.js'
import { Encryptor, NoEncryption } from './crypto-utils.js'

export interface AdaptablePostgresStorageOptions {
  encryptor?: Encryptor
}

export class AdaptablePostgresStorage implements SessionStorage {
  public readonly ready: Promise<void>
  private client: BasePostgresConnection
  private encryptor: Encryptor

  constructor(
    dbConnection: BasePostgresConnection,
    options: AdaptablePostgresStorageOptions = {},
  ) {
    this.client = dbConnection
    this.ready = this.connectClient()
    this.encryptor = options.encryptor || new NoEncryption()
  }

  public async storeSession(session: Session): Promise<boolean> {
    await this.ready
    const entries = session.toPropertyArray().map(([key, value]) => {
      switch (key) {
        case 'expires':
          // Note milliseconds to seconds conversion for `expires` property
          return [key, Math.floor((value as number) / 1000)]
        case 'accessToken':
          // encrypt access token
          return [key, this.encryptor.encrypt(value as string)]
        default:
          return [key, value]
      }
    })

    const query = `
      INSERT INTO "${this.client.sessionStorageIdentifier}"
        (${entries.map(([key]) => `"${key}"`).join(', ')})
      VALUES (${entries
        .map((_, i) => `${this.client.getArgumentPlaceholder(i + 1)}`)
        .join(', ')}) ON CONFLICT ("id") DO
      UPDATE SET ${entries
        .map(([key]) => `"${key}" = Excluded."${key}"`)
        .join(', ')};
    `
    await this.client.query(
      query,
      entries.map(([_key, value]) => value),
    )
    return true
  }

  public async loadSession(id: string): Promise<Session | undefined> {
    await this.ready
    const query = `
      SELECT *
      FROM "${this.client.sessionStorageIdentifier}"
      WHERE "id" = ${this.client.getArgumentPlaceholder(1)};
    `
    const rows = await this.client.query(query, [id])
    if (!Array.isArray(rows) || rows?.length !== 1) return undefined
    const rawResult = rows[0] as any

    return this.databaseRowToSession(rawResult)
  }

  public async deleteSession(id: string): Promise<boolean> {
    await this.ready
    const query = `
      DELETE
      FROM "${this.client.sessionStorageIdentifier}"
      WHERE "id" = ${this.client.getArgumentPlaceholder(1)};
    `
    await this.client.query(query, [id])
    return true
  }

  public async deleteSessions(ids: string[]): Promise<boolean> {
    await this.ready
    const query = `
      DELETE
      FROM "${this.client.sessionStorageIdentifier}"
      WHERE "id" IN (${ids
        .map((_, i) => `${this.client.getArgumentPlaceholder(i + 1)}`)
        .join(', ')});
    `
    await this.client.query(query, ids)
    return true
  }

  public async findSessionsByShop(shop: string): Promise<Session[]> {
    await this.ready

    const query = `
      SELECT *
      FROM "${this.client.sessionStorageIdentifier}"
      WHERE "shop" = ${this.client.getArgumentPlaceholder(1)};
    `
    const rows = await this.client.query(query, [shop])
    if (!Array.isArray(rows) || rows?.length === 0) return []

    const results: Session[] = rows.map((row: any) => {
      return this.databaseRowToSession(row)
    })
    return results
  }

  public disconnect(): Promise<void> {
    return this.client.disconnect()
  }

  private async connectClient(): Promise<void> {
    await this.client.connect()
  }

  private databaseRowToSession(row: any): Session {
    // convert seconds to milliseconds prior to creating Session object
    if (row.expires) row.expires *= 1000

    // decrypt access token
    if (row.accessToken) row.accessToken = this.encryptor.decrypt(row.accessToken)

    return Session.fromPropertyArray(Object.entries(row))
  }
}
