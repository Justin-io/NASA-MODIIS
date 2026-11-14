# ALEX Scientific Experiment & Calibration Log

**Platform Version**: 2.7.0  
**Repository**: `alex-environmental-intelligence`  
**Purpose**: Reproducible Record of Scientific Experiments, Algorithm Evolutions, and Empirical Evaluations

---

## Experiment Index

| Experiment ID | Title | Date | Methodology | Outcome |
|---|---|---|---|---|
| **EXP-2026-001** | Footprint Geometry Association vs Fixed 0.015° Radius | 2026-11-01 | Elliptical scan/track expansion modeling | Reduced swath-edge false splits; eliminated near-nadir false merges. |
| **EXP-2026-002** | VIIRS Native Categorical vs Arbitrary Numeric Mapping | 2026-11-01 | Preservation of raw `low`/`nominal`/`high` strings | Eliminated synthetic 30/70/95 confidence fabrication (DATA-05). |
| **EXP-2026-003** | Zero-Fallback Regional Climatology Validation | 2026-11-01 | Empirical monthly median aggregation | Unpopulated AOIs truthfully report 0 records (DATA-01, DATA-02). |
| **EXP-2026-004** | SGP4 Keplerian Propagation vs Fixed Orbital Steps | 2026-11-01 | NORAD TLE propagation with $J_2$ precession | Verified sub-kilometer orbital accuracy against CelesTrak ephemerides. |
| **EXP-2026-005** | Cryptographic RBAC & Operator Secret Verification | 2026-11-01 | Constant-time HMAC-SHA256 signature gating | Blocked unauthenticated role escalation (SEC-01, SEC-02). |

---

## Detailed Experiment Logs

### EXP-2026-001: Footprint-Aware Spatial Association (MODIS/VIIRS)
- **Objective**: Replace simplistic Euclidean distance clustering ($0.015^\circ \approx 1.66\text{ km}$) with physical instantaneous field of view (IFOV) footprint bounding ellipses.
- **Hypothesis**: Off-nadir MODIS pixels expand up to $4.8\text{ km} \times 2.0\text{ km}$ at $\pm 55^\circ$, causing fixed-radius clustering to fragment valid single-fire detections at scan edges while erroneously combining distinct small fires near nadir.
- **Formulation**:
  $$a = \frac{\text{scanPixelKm} \times 1000}{2}, \quad b = \frac{\text{trackPixelKm} \times 1000}{2}$$
  $$D_{12} \le \sqrt{a_1^2 + b_1^2} + \sqrt{a_2^2 + b_2^2}$$
- **Result**: Validated in `src/shared/intelligenceEngine.test.ts`. Near-nadir VIIRS 375m detections maintain tight $180\text{ m}$ uncertainty bounds, while edge MODIS overpasses properly associate across the expanded pixel swath.

---

### EXP-2026-002: Categorical Confidence Preservation
- **Objective**: Eradicate artificial mapping of VIIRS confidence classes (`low` $\to$ 30, `nominal` $\to$ 70, `high` $\to$ 95).
- **Finding**: VIIRS 375m active fire algorithm (Schroeder et al., 2014) assigns confidence categories based on background temperature conditions and day/night thresholds, not a scalar probability. Converting categories into arbitrary percentages is scientifically indefensible.
- **Implementation**: `RawSatelliteObservation` schema preserves `viirsConfidenceCategory` as `'low' | 'nominal' | 'high' | null`, while `modisConfidencePct` stores native integer $0\text{--}100$ only for MODIS records.
- **Result**: Verified in `test/firms.test.ts`. Zero synthetic percentages generated.

---

### EXP-2026-003: Empirical Fire Calendar Without Cross-Region Substitution
- **Objective**: Prevent silent fallback to adjacent states or global averages when querying unmonitored geographical areas.
- **Finding**: Previous versions auto-substituted Nilgiris data when an empty region was queried, creating catastrophic misinformation during crisis analysis.
- **Implementation**: `computeRegionalBurningCalendarMath` returns `dataAvailability: 'UNAVAILABLE'` and 0 monthly records when an unpopulated AOI is queried.
- **Result**: Verified in `test/dataIntegrity.test.ts` and `test/fireCalendar.test.ts`.

---

### EXP-2026-004: SGP4 Propagation & Orbital Regime Differentiation
- **Objective**: Accurately predict satellite sub-point coordinates and overflight geometry from official NORAD TLE parameters.
- **Parameters Evaluated**:
  - Terra (LEO sun-synchronous, inclination $98.2^\circ$, altitude $705\text{ km}$, period $99\text{ min}$)
  - NOAA-20 (LEO sun-synchronous, inclination $98.7^\circ$, altitude $824\text{ km}$, period $101\text{ min}$)
  - Himawari-9 & GOES-16 (Geostationary, inclination $0.0^\circ$, altitude $35,786\text{ km}$, period $1436\text{ min}$)
- **Result**: Verified in `test/orbital.test.ts`. Distinguishes LEO orbital velocities ($\approx 7.5\text{ km/s}$) from GEO stationary fixed longitudes ($\approx 0.0\text{ deg/day}$ ground drift).

---

### EXP-2026-005: Cryptographic RBAC & Operator Secret Verification
- **Objective**: Close privilege escalation vulnerability on `POST /api/auth/token`.
- **Finding**: Legacy implementation permitted callers to self-declare `role: 'system_administrator'` or `role: 'incident_commander'` without supplying credentials.
- **Implementation**: Self-service requests without `operatorSecret` are strictly capped to `public_viewer`. Issuance of elevated operational roles requires verification against `process.env.ALEX_OPERATOR_SECRET`.
- **Result**: Verified in `test/securityRbac.test.ts`.
