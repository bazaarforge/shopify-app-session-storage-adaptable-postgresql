import { afterAll, beforeAll, describe } from 'vitest'
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

  return async () => {
    await exec(`podman rm -f ${containerId}`)
  }
})

afterAll(async () => {
  await exec(`podman rm -f ${containerId}`)
})

describe(`AdaptablePostgreSQLSessionStorage > NativePostgresConnection`, async () => {
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
describe(`AdaptablePostgreSQLSessionStorage > PgPromiseConnection`, () => {
  const client = pgp({
    host: dbURL.hostname,
    user: decodeURIComponent(dbURL.username),
    password: decodeURIComponent(dbURL.password),
    database: decodeURIComponent(dbURL.pathname.slice(1)),
  })
  const storage = new AdaptablePostgresStorage(new PgPromiseConnection(client))

  batteryOfTests(async () => storage)
})
