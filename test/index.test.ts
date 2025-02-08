import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  NativePostgresConnection,
  AdaptablePostgresStorage,
  PgPromiseConnection,
} from '../src/index.js'
import pg from 'pg'
import pgPromise from 'pg-promise'
const pgp = pgPromise()

import { promisify } from 'util'
import * as child_process from 'child_process'
import { batteryOfTests } from './battery-of-tests.js'
import { poll } from './utils.js'
import { SymmetricEncryptor } from '../src/crypto-utils.js'
import crypto from 'crypto';

describe('AdaptablePostgreSQLSessionStorage', ()=> {

  const exec = promisify(child_process.exec)

  const dbURL = new URL(
    `postgres://${encodeURIComponent('shop&fy')}:${encodeURIComponent(
      'passify#$',
    )}@localhost/${encodeURIComponent('shop&test')}`,
  )

  let containerId: string
  beforeAll(async () => {
    const runCommand = await exec(
      "podman run -d -e POSTGRES_DB='shop&test' -e POSTGRES_USER='shop&fy' -e POSTGRES_PASSWORD='passify#$' -p 5432:5432 postgres:15",
      { encoding: 'utf8' },
    )

    containerId = runCommand.stdout.trim()

    await poll(
      async () => {
        try {
          const client = new pg.Client({
            host: dbURL.hostname,
            user: decodeURIComponent(dbURL.username),
            password: decodeURIComponent(dbURL.password),
            database: decodeURIComponent(dbURL.pathname.slice(1)),
          })
          await client.connect()

        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS "shopify_sessions"(
            "id"  text NOT NULL PRIMARY KEY,
            "shop" text NOT NULL,
            "state" varchar(255) NOT NULL,
            "isOnline" boolean default false not null,
            "onlineAccessInfo" text,
            "scope" text,
            "expires" integer,
            "accessToken" text,
            "userId" bigint,
            "firstName" text,
            "lastName" text,
            "email" text,
            "accountOwner" boolean default false not null,
            "locale" text,
            "collaborator" boolean default false,
            "emailVerified" boolean default false
          );`
          await client.query(createTableQuery)

          await client.end()
        } catch (error) {
          // console.error(error) // uncomment to see error for debugging tests
          return false
        }
        return true
      },
      { interval: 500, timeout: 80000 },
    )
  })

  afterAll(async () => {
    await exec(`podman rm -f ${containerId}`)
  })


  describe(`NativePostgresConnection`, async () => {
    let storage: AdaptablePostgresStorage

    beforeAll(() => {
      storage = new AdaptablePostgresStorage(
        new NativePostgresConnection(dbURL.toString()),
      )
    })

    afterAll(() => {
      storage.disconnect()
    })


    batteryOfTests(async () => {
      await storage.ready
      return storage
    })
  })
  describe(`PgPromiseConnection`, () => {
    const client = pgp({
      host: dbURL.hostname,
      user: decodeURIComponent(dbURL.username),
      password: decodeURIComponent(dbURL.password),
      database: decodeURIComponent(dbURL.pathname.slice(1)),
    })
    const storage = new AdaptablePostgresStorage(new PgPromiseConnection(client))

    batteryOfTests(async () => storage)
  })
})


describe('Encryptor', () => {
  it('encrypts and decrypts', () => {
    const key = crypto.randomBytes(32).toString('hex');
    const encryptor = new SymmetricEncryptor({
      key
    });
    const value1 = "test";
    const value2 = "a longer string";
    const encrypted1 = encryptor.encrypt(value1);
    const encrypted2 = encryptor.encrypt(value2);
    const decrypted1 = encryptor.decrypt(encrypted1);
    const decrypted2 = encryptor.decrypt(encrypted2);
    expect(encrypted1).not.toBe(value1);
    expect(encrypted2).not.toBe(value2);
    expect(encrypted2).not.toBe(encrypted1);
    expect(decrypted1).toBe(value1);
    expect(decrypted2).toBe(value2);
  });
})
