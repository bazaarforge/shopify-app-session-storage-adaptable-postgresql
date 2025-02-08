# Adaptable Shopify Session Adapter

A shopify session adapter that allows you to customize how you connect to PostgreSQL.

## Customizable Access to PostgreSQL

If you're using a library such as `pg-promise` or want to customize the way the connection is managed or the database is queried, the adapter offered by Shopify may not be ideal.

This adapter offers the following:

- more flexibility in choosing how to connect to PostgreSQL
- no automatic table creation or migration
- possibility to encrypt the `accessToken`

### Native PostgreSQL Adapter

Using the native `pg` library:

```typescript
// Example usage with NativePostgresConnection

import {
  NativePostgresConnection,
  AdaptablePostgresStorage
} from '@bazaarforge/shopify-app-session-storage-adaptable-postgresql';

const sessionTableName = 'shopify_sessions';
const url = `postgres://user:password@host/dbname`

const storage = new AdaptablePostgresStorage(
  new NativePostgresConnection(url, sessionTableName)
);
```

### pg-promise Adapter

Using the `pg-promise` adapter:

```typescript
// Example usage with PgPromiseConnection

import pgPromise from 'pg-promise';
import {
  PgPromiseConnection,
  AdaptablePostgresStorage
} from '@bazaarforge/shopify-app-session-storage-adaptable-postgresql';


const sessionTableName = 'shopify_sessions';
const pgp = pgPromise();
const db = pgp('postgres://user:password@host/dbname');

const storage = new AdaptablePostgresStorage(
  new PgPromiseConnection(db, sessionTableName)
);
```

### Custom Connection

You can extend the class `BasePostgresConnection`, see examples in `src`.


### No Auto-Creation of Session Table

Unlike Shopify's adapter, this adapter will not automatically create the session database table.
We believe this is not the responsibility of the runtime to do so.

Instead, you can add this table to your database manually:

```sql
CREATE TABLE IF NOT EXISTS "UserSession" (
  "id" varchar(255) NOT NULL PRIMARY KEY,
  "shop" varchar(255) NOT NULL,
  "state" varchar(255) NOT NULL,
  "isOnline" boolean NOT NULL,
  "scope" varchar(255),
  "expires" integer,
  "onlineAccessInfo" varchar(255),
  "accessToken" varchar(255)
);
```

We recommend using a migration tool such as [goose](https://github.com/pressly/goose), [node-pg-migrate](https://www.npmjs.com/package/node-pg-migrate), [umzug](https://github.com/sequelize/umzug), etc.

### Option to encrypt access token

While Shopify recommends to encrypt the db at rest, we still believe that it is bad for the merchants' privacy to encrypt their access token in the db.

Shopify's adapter does not encrypt the session token, with this adapter you can configure a signature key for symetrical client-side encryption of the token. That means that now the token will be stored encrypted in the db.
