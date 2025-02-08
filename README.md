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
  "shop" TEXT NOT NULL,
  "state" varchar(255) NOT NULL,
  "isOnline" boolean NOT NULL,
  "scope" TEXT,
  "expires" integer,
  "onlineAccessInfo" TEXT,
  "accessToken" TEXT
);
```

We recommend using a migration tool such as [goose](https://github.com/pressly/goose), [node-pg-migrate](https://www.npmjs.com/package/node-pg-migrate), [umzug](https://github.com/sequelize/umzug), etc.

### Option to encrypt access token

Shopify recommends encrypting the database at rest; however, we believe that storing merchants' access tokens in plain text within the database poses significant privacy risks.

Unlike Shopify's default adapter, which does not encrypt session tokens, this adapter allows you to configure a signature key for [symmetrical client-side encryption](https://en.wikipedia.org/wiki/Symmetric-key_algorithm). As a result, access tokens are securely encrypted before being stored in the database.

#### Encrypt access token

Be aware that this should **not** be done on an existing production database without a proper migration.

1. **Generate a secret key**, it should be a 32 bit key. On Linux, you can run in the terminal `openssl rand -hex 32`. This key should be kept **secret** and **not be lost**, as **it is essential for encrypting and decrypting your data**. You can store this key in an env variable or in a vault.

To use the `SymmetricEncryptor` for encrypting and decrypting data, follow the example below:

```typescript
import {
  SymmetricEncryptor,
  NativePostgresConnection,
  AdaptablePostgresStorage
} from '@bazaarforge/shopify-app-session-storage-adaptable-postgresql';
import crypto from 'crypto';

// The encryption key that you generated in the previous step
const key = process.env.ENCRYPTION_KEY;

// Create an instance of SymmetricEncryptor
const encryptor = new SymmetricEncryptor({ key });

// Create an instance of AdaptablePostgresStorage using the encryptor
const storage = new AdaptablePostgresStorage(
  new NativePostgresConnection("postgres://..."),
  {
    encryptor
  }
);
```
