-- ALEX v2.6.0 PostgreSQL + PostGIS Initial Schema Migration
-- Migration: 001_initial_schema.sql
-- Enables PostGIS spatial extensions and creates normalized entities with explicit SRID 4326.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. Schema Migrations Ledger
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Authenticated Users & Role Clearance
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(128) UNIQUE NOT NULL,
  role VARCHAR(64) NOT NULL CHECK (role IN ('public_viewer', 'field_responder', 'incident_commander', 'system_administrator')),
  agency VARCHAR(255) NOT NULL,
  clearance_level INTEGER NOT NULL CHECK (clearance_level BETWEEN 0 AND 3),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Incidents (Server-controlled operational records)
CREATE TABLE IF NOT EXISTS incidents (
  id VARCHAR(64) PRIMARY KEY,
  title TEXT NOT NULL,
  region VARCHAR(64) NOT NULL,
  district TEXT NOT NULL,
  status VARCHAR(64) NOT NULL CHECK (status IN (
    'OBSERVED', 'REPORTED', 'INFERRED', 'MODELLED',
    'CORROBORATED', 'VERIFIED_BY_AUTHORITY', 'SUPERSEDED',
    'INVALIDATED', 'UNAVAILABLE',
    -- Legacy compatibility aliases:
    'satellite_thermal_anomaly', 'candidate_incident', 'field_confirmed',
    'authority_confirmed_emergency', 'contained', 'resolved'
  )),
  severity VARCHAR(32) NOT NULL CHECK (severity IN ('critical', 'high', 'moderate', 'low')),
  coordinates_geom GEOMETRY(Point, 4326) NOT NULL,
  uncertainty_radius_m DOUBLE PRECISION NOT NULL DEFAULT 250.0,
  first_observed TIMESTAMP WITH TIME ZONE NOT NULL,
  latest_observed TIMESTAMP WITH TIME ZONE NOT NULL,
  modis_count INTEGER NOT NULL DEFAULT 0,
  viirs_count INTEGER NOT NULL DEFAULT 0,
  peak_frp_mw DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  historical_median_frp_mw DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  estimated_area_ha DOUBLE PRECISION,
  estimated_population_exposed INTEGER,
  summary TEXT,
  unverified_notes TEXT,
  authority_status TEXT NOT NULL DEFAULT 'Awaiting Initial Assessment',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_geom ON incidents USING GIST (coordinates_geom);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_region ON incidents (region);

-- 4. Raw Satellite Observations (Decoupled from incidents, preserving sensor provenance)
CREATE TABLE IF NOT EXISTS raw_observations (
  id VARCHAR(128) PRIMARY KEY,
  incident_id VARCHAR(64) REFERENCES incidents(id) ON DELETE SET NULL,
  source_id VARCHAR(64) NOT NULL,
  provider VARCHAR(64) NOT NULL DEFAULT 'NASA_FIRMS',
  sensor VARCHAR(64) NOT NULL,
  satellite VARCHAR(32),
  product_layer VARCHAR(32),
  collection VARCHAR(32) NOT NULL DEFAULT 'C6.1/V2',
  location_geom GEOMETRY(Point, 4326) NOT NULL,
  scan_pixel_km DOUBLE PRECISION,
  track_pixel_km DOUBLE PRECISION,
  scan_angle_deg DOUBLE PRECISION,
  brightness_kelvin DOUBLE PRECISION,
  frp_mw DOUBLE PRECISION,
  confidence_pct INTEGER CHECK (confidence_pct IS NULL OR (confidence_pct BETWEEN 0 AND 100)),
  confidence_category VARCHAR(16) CHECK (confidence_category IS NULL OR confidence_category IN ('low', 'nominal', 'high')),
  day_night CHAR(1) CHECK (day_night IS NULL OR day_night IN ('D', 'N')),
  orbit_pass TEXT,
  acquired_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ingested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verification_state VARCHAR(64) NOT NULL DEFAULT 'OBSERVED',
  checksum_sha256 VARCHAR(64),
  provenance_url TEXT,
  raw_payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_raw_obs_geom ON raw_observations USING GIST (location_geom);
CREATE INDEX IF NOT EXISTS idx_raw_obs_incident ON raw_observations (incident_id);
CREATE INDEX IF NOT EXISTS idx_raw_obs_acquired ON raw_observations (acquired_at);
CREATE INDEX IF NOT EXISTS idx_raw_obs_sensor ON raw_observations (sensor);

-- 5. Harmonized Thermal Events (Footprint-aware multi-sensor fusion hypotheses)
CREATE TABLE IF NOT EXISTS harmonized_events (
  id VARCHAR(64) PRIMARY KEY,
  incident_id VARCHAR(64) REFERENCES incidents(id) ON DELETE CASCADE,
  centroid_geom GEOMETRY(Point, 4326) NOT NULL,
  footprint_polygon_geom GEOMETRY(Polygon, 4326),
  peak_frp_mw DOUBLE PRECISION NOT NULL,
  viirs_count INTEGER NOT NULL DEFAULT 0,
  modis_count INTEGER NOT NULL DEFAULT 0,
  spatial_uncertainty_m DOUBLE PRECISION NOT NULL,
  harmonization_method VARCHAR(64) NOT NULL DEFAULT 'FOOTPRINT_ELLIPSE_OVERLAP',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_harmonized_centroid ON harmonized_events USING GIST (centroid_geom);
CREATE INDEX IF NOT EXISTS idx_harmonized_incident ON harmonized_events (incident_id);

-- 6. Cryptographic Audit Ledger (Append-only blockchain event log)
CREATE TABLE IF NOT EXISTS audit_ledger (
  sequence SERIAL PRIMARY KEY,
  event_id VARCHAR(64) UNIQUE NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  actor VARCHAR(128) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  payload JSONB NOT NULL,
  prev_hash VARCHAR(64) NOT NULL,
  hash VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ledger_hash ON audit_ledger (hash);
CREATE INDEX IF NOT EXISTS idx_ledger_event_type ON audit_ledger (event_type);

-- 7. Casualty Coordination Records
CREATE TABLE IF NOT EXISTS casualty_reports (
  id VARCHAR(64) PRIMARY KEY,
  incident_id VARCHAR(64) REFERENCES incidents(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  verification_status VARCHAR(64) NOT NULL,
  location_name TEXT NOT NULL,
  coordinates_geom GEOMETRY(Point, 4326) NOT NULL,
  uncertainty_radius_m DOUBLE PRECISION NOT NULL DEFAULT 150.0,
  injured_count INTEGER NOT NULL DEFAULT 0,
  missing_count INTEGER NOT NULL DEFAULT 0,
  urgency VARCHAR(32) NOT NULL CHECK (urgency IN ('Immediate (T1)', 'Delayed (T2)', 'Minimal (T3)', 'Expectant (T4)')),
  medical_notes TEXT,
  dispatch_state VARCHAR(64) NOT NULL CHECK (dispatch_state IN (
    'draft', 'awaiting_dispatcher_approval', 'dispatched', 'on_scene', 'transporting', 'delivered', 'cancelled'
  )),
  authorized_integration_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  reported_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Multi-Agency Coordination Tasks
CREATE TABLE IF NOT EXISTS agency_tasks (
  id VARCHAR(64) PRIMARY KEY,
  agency VARCHAR(64) NOT NULL,
  title TEXT NOT NULL,
  owner VARCHAR(128) NOT NULL,
  status VARCHAR(64) NOT NULL CHECK (status IN ('Proposed by ALEX', 'Assigned', 'In Progress', 'Completed')),
  assigned_incident_id VARCHAR(64) REFERENCES incidents(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Community Advisories & Public Bulletins
CREATE TABLE IF NOT EXISTS community_bulletins (
  id VARCHAR(64) PRIMARY KEY,
  incident_id VARCHAR(64) REFERENCES incidents(id) ON DELETE SET NULL,
  severity VARCHAR(32) NOT NULL CHECK (severity IN ('critical', 'high', 'moderate', 'low')),
  headline TEXT NOT NULL,
  instruction TEXT NOT NULL,
  districts TEXT[] NOT NULL,
  authorized_by VARCHAR(128) NOT NULL,
  dispatched_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Record Migration Completion
INSERT INTO schema_migrations (version, name)
VALUES (1, '001_initial_schema')
ON CONFLICT (version) DO NOTHING;
