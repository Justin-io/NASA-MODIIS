# Persistence, Cryptographic Ledger & Security Architecture

ALEX implements a dual persistence layer, an immutable HMAC-SHA256 hash-chained cryptographic ledger, and zero-trust Role-Based Access Control (RBAC).

---

## 1. PostgreSQL & PostGIS Spatial Architecture

PostgreSQL with PostGIS extensions serves as the production enterprise spatial persistence engine. The schema definition in [001_initial_schema.sql](file:///home/justin/Desktop/NASA/server/db/migrations/001_initial_schema.sql) enforces spatial indexing and physical telemetry constraints.

### 1.1 Schema Specifications

#### 1. Table: `observations`
Stores individual satellite thermal anomalies ingested from NASA FIRMS.
```sql
CREATE TABLE IF NOT EXISTS observations (
    id VARCHAR(128) PRIMARY KEY,
    source_provider VARCHAR(32) NOT NULL,
    source_product_id VARCHAR(64) NOT NULL,
    product_layer VARCHAR(32) NOT NULL,
    satellite VARCHAR(32) NOT NULL,
    sensor VARCHAR(32) NOT NULL,
    acquisition_timestamp_utc TIMESTAMPTZ NOT NULL,
    ingestion_timestamp_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude NUMERIC(9, 5) NOT NULL,
    longitude NUMERIC(9, 5) NOT NULL,
    geom GEOMETRY(Point, 4326),
    frp_mw NUMERIC(8, 2),                   -- Nullable: preserves sensor-native nulls
    brightness_kelvin NUMERIC(6, 2),        -- Nullable
    background_brightness_kelvin NUMERIC(6, 2), -- Nullable
    scan_pixel_km NUMERIC(5, 2),            -- Nullable
    track_pixel_km NUMERIC(5, 2),           -- Nullable
    modis_confidence_pct SMALLINT,          -- 0-100 (null for VIIRS)
    confidence_category VARCHAR(16),        -- 'low'/'nominal'/'high' (null for MODIS)
    qa_cloud_flag VARCHAR(32) DEFAULT 'unassessed',
    payload_checksum_sha256 CHAR(64) NOT NULL
);

CREATE INDEX idx_observations_geom ON observations USING GIST (geom);
CREATE INDEX idx_observations_timestamp ON observations (acquisition_timestamp_utc);
CREATE INDEX idx_observations_sensor ON observations (sensor, product_layer);
```

#### 2. Table: `incidents`
Monitored wildland fire incidents with epistemic verification tiers.
```sql
CREATE TABLE IF NOT EXISTS incidents (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    region VARCHAR(64) NOT NULL,
    district VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,            -- VerificationLevel enum
    severity VARCHAR(32) NOT NULL,          -- RiskSeverity enum
    latitude NUMERIC(9, 5) NOT NULL,
    longitude NUMERIC(9, 5) NOT NULL,
    geom GEOMETRY(Point, 4326),
    estimated_area_ha NUMERIC(10, 2) NOT NULL DEFAULT 0,
    uncertainty_radius_meters INTEGER NOT NULL,
    first_observed TIMESTAMPTZ NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_geom ON incidents USING GIST (geom);
CREATE INDEX idx_incidents_status ON incidents (status);
```

#### 3. Table: `evidence_ledger`
Database mirror of the immutable cryptographic audit chain.
```sql
CREATE TABLE IF NOT EXISTS evidence_ledger (
    sequence BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(64) NOT NULL,
    actor VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL,
    previous_hash CHAR(64) NOT NULL,
    hash CHAR(64) NOT NULL,
    CONSTRAINT chk_hash_length CHECK (length(hash) = 64)
);

CREATE UNIQUE INDEX idx_evidence_ledger_hash ON evidence_ledger (hash);
```

### 1.2 Zero-Trust Parameterized Database Client (`server/db/postgresClient.ts`)
- All database queries are strictly parameterized using PostgreSQL positional parameter markers (`$1`, `$2`, etc.) to prevent SQL injection.
- When `DATABASE_URL` is omitted or PostgreSQL is unreachable, the server transparently degrades to the atomic filesystem store without crashing.

---

## 2. Atomic File Store Architecture (`server/db/store.ts`)

In development, offline, or fail-over environments, ALEX utilizes the atomic persistence engine `ProductionStore`.

### 2.1 Atomic Write Operations
To guarantee durability and prevent corrupted JSON states during process termination or OS crashes:
1. Operational state is serialized to a canonical UTF-8 JSON buffer.
2. The buffer is written to a temporary staging file: `data/store.json.tmp`.
3. The filesystem executes an atomic rename:
   ```typescript
   fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf-8');
   fs.renameSync(tmpPath, this.filePath);
   ```
   On POSIX systems, `rename` is an atomic operating system syscall that guarantees reader processes never observe partially written files.

### 2.2 Deduplication Ingestion Algorithms
To prevent duplicate records upon repeated API fetches:
```typescript
public async addRawObservations(observations: RawSatelliteObservation[]): Promise<number> {
  const existingIds = new Set(this.data.rawObservations.map((o) => o.id));
  const newUnique = observations.filter((o) => !existingIds.has(o.id));
  if (newUnique.length > 0) {
    this.data.rawObservations.push(...newUnique);
    await this.save();
  }
  return newUnique.length;
}
```

---

## 3. Cryptographic Ledger Architecture (`server/db/ledger.ts`)

All consequential state transitions (e.g., promoting an incident to `authority_confirmed_emergency`, dispatching mutual-aid tenders, promoting machine learning models) must be appended to the immutable cryptographic ledger stored in [ledger.jsonl](file:///home/justin/Desktop/NASA/data/ledger.jsonl).

### 3.1 Block Schema

```
+--------------------------------------------------------------------------+
| Block Sequence: N                                                        |
| Timestamp: 2026-11-14T05:22:12.000Z                                     |
| Event Type: INCIDENT_STATUS_CHANGE                                       |
| Actor: Commander-Auth-7881                                               |
| Payload: {"incidentId": "INC-01", "from": "candidate", "to": "confirmed"}|
| Previous Hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991... |
| Block Hash:    a8f5c92849b10c8427ae41e4649b934ca495991b7852b855da3411... |
+--------------------------------------------------------------------------+
```

### 3.2 Block Hash Derivation
The SHA-256 digest of block $i$ is derived strictly over canonical serialized fields:
$$H_i = \text{SHA-256}(\text{sequence} \parallel \text{timestamp} \parallel \text{eventType} \parallel \text{actor} \parallel \text{canonicalJson}(\text{payload}) \parallel H_{i-1})$$

For the Genesis Block ($i = 0$):
$$H_{\text{prev}} = \text{'0000000000000000000000000000000000000000000000000000000000000000'}$$

### 3.3 Integrity Verification Algorithm
The verification procedure checks the entire ledger from Genesis Block 0 to the tip:
1. Re-computes $H_i$ for every line. If $H_i \neq \text{block.hash}$, verification fails.
2. Asserts that $\text{block}_i.\text{previousHash} == \text{block}_{i-1}.\text{hash}$. If a broken link is detected, the ledger is flagged as tampered.
3. Asserts monotonically increasing sequence numbers ($\text{seq}_i == \text{seq}_{i-1} + 1$).

---

## 4. Security, RBAC & Token Lifecycle (`server/auth/tokens.ts`, `server/middleware/auth.ts`)

### 4.1 Token Structure & Signatures
Tokens use HMAC-SHA256 signatures with constant-time verification:
```
[Base64Url Payload].[Base64Url HMAC-SHA256 Signature]
```

### 4.2 Constant-Time Timing-Attack Mitigation
To eliminate timing attacks during signature verification:
```typescript
public verifyToken(token: string): TokenPayload | null {
  const [encodedPayload, providedSignature] = token.split('.');
  const expectedSignature = crypto
    .createHmac('sha256', this.secret)
    .update(encodedPayload)
    .digest('base64url');

  const bufA = Buffer.from(providedSignature, 'base64url');
  const bufB = Buffer.from(expectedSignature, 'base64url');

  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return null; // Signature mismatch
  }
  // Validate expiry and claims...
}
```

### 4.3 Authorization Gate Matrix

| Route / Capability | Minimum Required Role | Required Secret / Header |
|---|---|---|
| `GET /api/observations` | `public_viewer` | None (Public Science Transparency) |
| `GET /api/firelens/*` | `public_viewer` | None (Reproducible Research Asset) |
| `POST /api/community/reports` | `public_viewer` | Rate-limited client token |
| `POST /api/incidents/:id/status` | `incident_commander` | `Authorization: Bearer <HMAC_TOKEN>` |
| `POST /api/learning/promote` | `incident_commander` | Dual-authorization commander signature |
| `POST /api/telephony/dispatch` | `incident_commander` | `ALEX_OPERATOR_SECRET` validation |

