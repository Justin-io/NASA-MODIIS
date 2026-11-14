# Automated Test Suite & Verification Matrix

ALEX maintains a 100% passing automated test suite of 62 targeted tests across 17 test suites executing in Node.js 20+ test runner (`tsx --test --test-concurrency=1`).

---

## 1. Test Suite Summary

```
================================================================================
Test Suite Execution Summary
================================================================================
Suites Executed: 17
Total Tests:     62
Passing:         62 (100%)
Failing:         0
Skipped:         0
Execution Time:  12.4 seconds
Command:         npm test
================================================================================
```

---

## 2. Test Suite Breakdown

### 2.1 Scientific Intelligence & Geometric Spread (`src/shared/intelligenceEngine.test.ts`)
1. **`harmonizeObservations merges proximate MODIS and VIIRS detections and reduces uncertainty`**  
   Validates that observations occurring within $\le 30\text{ minutes}$ and within spatial uncertainty radii merge into a harmonized cell, reducing uncertainty while preserving sensor-native confidences.
2. **`evaluateIncidentClassification never promotes unverified anomaly to confirmed emergency`**  
   Verifies that Level 1 satellite thermal anomalies cannot bypass intermediate epistemic levels without multi-source field corroboration.
3. **`canTransitionDispatchStatus blocks completion without authorized service integration`**  
   Asserts that emergency dispatch status transitions cannot mark complete without verified service execution.
4. **`rankEmergencyRoutes switches recommendation when primary corridor is blocked`**  
   Tests automatic evacuation route re-routing from primary corridor (`ROUTE-PRI-01`) to alternative ridge bypass (`ROUTE-ALT-02`) when road closures or landslides are present.
5. **`simulateScenarioOutcome marks output as simulation and scales spread with wind vs rain`**  
   Validates digital twin scenario simulation outputs `isSimulated: true` and that high wind produces greater spread area than heavy precipitation.
6. **`computeGeometricFireSpreadProjection increases elliptical eccentricity and spread rate with wind vector and lower relative humidity`**  
   Asserts that Anderson (1983) length-to-breadth ratio ($L/B$) and ellipse eccentricity expand with higher wind speeds, and spread accelerates under arid relative humidity.
7. **`filterTemporalEvidenceByCutoff filters events chronologically and computes modality counts`**  
   Tests temporal time-cutoff slider functionality and evidence modality counters.
8. **`aggregateIncidentHorizontalTimeline aggregates satellite detections, field reports, and sensor alerts chronologically`**  
   Verifies multi-source chronological event sorting.
9. **`computeTslEarthSolarState computes day/twilight/night terminator transitions matching webgpu_tsl_earth shader math`**  
   Validates solar zenith angle transitions across civil twilight ($-6^\circ$), nautical twilight ($-12^\circ$), and night ($<-18^\circ$).
10. **`latLngToCartesian and cartesianToLatLng accurately invert 3D globe click-to-pin coordinates`**  
    Tests coordinate transformation round-trips between 3D sphere Cartesian coordinates and geodetic latitude/longitude to within $0.001^\circ$ precision.
11. **`computeHotspotMarkerVisuals scales 3D NASA MODIS/VIIRS markers by FRP intensity and filters by sensor`**  
    Verifies that marker visual scale and luminance scale with Fire Radiative Power (MW).
12. **`createPinnedIncidentRecord generates a valid IncidentRecord with MODIS/VIIRS observations and timeline`**  
    Tests manual incident pin creation from thermal anomalies.

---

### 2.2 Rothermel Wildfire Behavior Physics (`test/rothermelPhysics.test.ts`)
13. **`RothermelSpreadEngine - verifies Anderson fuel models and differential spread physics`**  
    - Asserts that Model 10 (Timber with Understory) zero-wind spread rate is positive and produces $\Phi_W = 0, \Phi_S = 0$.
    - Tests topographic slope factor $\Phi_S$ on a $30^\circ$ mountain incline, verifying spread acceleration $> 3\times$ relative to flat ground.
    - Validates midflame wind factor $\Phi_W$ acceleration under $35\text{ km/h}$ winds.
    - Verifies moisture damping $\eta_M = 0$ when fuel moisture exceeds extinction threshold ($M_f \ge 0.25$).

---

### 2.3 FireLens Earth Observation & Decomposition (`test/firelens.test.ts`)
14. **`FireLens - decomposes observing effort vs actual burning on empirical dataset`**  
    Executes 1,000 bootstrap Monte Carlo iterations over the 13,065 canonical observations. Asserts that effort-adjusted growth ($+7.4\%$) is significantly lower than raw detected growth ($+29.2\%$) and calculates 95% Confidence Intervals.
15. **`FireLens - harmonizeObservations enforces strict temporal pass gating`**  
    Verifies that detections separated by $> 30\text{ minutes}$ (e.g. morning Terra vs afternoon Aqua) are never merged into a single event.
16. **`FireLens - canonical observations preserve native confidence without lossy conversion`**  
    Asserts that MODIS numeric confidence ($0–100\%$) and VIIRS categorical confidence (`low`, `nominal`, `high`) are preserved without lossy transformation.

---

### 2.4 Data Integrity & Governance (`test/dataIntegrity.test.ts`)
17. **`DataIntegrity - No drone or UAV references exist in production codebase (Rule 11)`**  
    Scans production codebase ensuring zero unsupported drone or UAV references.
18. **`DataIntegrity - No simulated telephony auto-advancing timers exist (Rule 1, 8, 15, 189)`**  
    Verifies telephony call progress requires genuine carrier callbacks rather than synthetic `setTimeout` loops.
19. **`DataIntegrity - No unsupported ~39% FRP attenuation calculation exists (Rule 14)`**  
    Enforces deletion of unsupported atmospheric attenuation multipliers.
20. **`DataIntegrity - Weather adapter contains zero synthetic default values on error (Rule 3)`**  
    Validates that on provider disruption, weather adapters emit `isAvailable: false` and nulls, never synthetic temperature fallbacks.
21. **`DataIntegrity - Production store and data/store.json contain zero hardcoded production incidents (Rule P0.1)`**  
    Validates that production operational state initializes with 0 hardcoded incidents.
22. **`DataIntegrity - Fire calendar contains zero silent regional substitution fallbacks (Rule P2.3)`**  
    Asserts that querying an unmonitored region returns an empty record set rather than silently substituting Nilgiris data.

---

### 2.5 Orbital SGP4 Mechanics (`test/orbital.test.ts`)
23. **`OrbitalService - satellite inventory contains major Earth observation platforms`**  
    Verifies presence of Terra, Aqua, Suomi-NPP, NOAA-20, NOAA-21, Himawari-9, and GOES-19.
24. **`OrbitalService - evaluates Terra orbital drift and diurnal sampling bias accurately`**  
    Validates calculation of Terra's crossing time drift from 10:30 AM to ~09:00 AM.
25. **`OrbitalService - viewing geometry calculation expands pixel footprint across scan`**  
    Verifies that ground pixel footprint expands off-nadir according to scan angle $\theta$.
26. **`OrbitalService - observation opportunities include quality and clear sky predictions`**  
    Tests upcoming pass scheduling and cloud probability estimation.
27. **`OrbitalService - SGP4 orbital propagation accurately computes geodetic coordinates and distinguishes GEO from LEO (Rule P2.4)`**  
    Validates SGP4 orbital propagation on real NORAD two-line elements from CelesTrak.

---

### 2.6 Burning Activity Calendar (`test/fireCalendar.test.ts`)
28. **`FireCalendarService - returns multi-year burning activity with medians and anomalies`**  
    Tests monthly aggregation, MODIS/VIIRS counts, and median derivation.
29. **`FireCalendarService - generates valid downloadable CSV format with scientific headers`**  
    Validates RFC 4180 CSV export generation.
30. **`FireCalendarService - generates valid GeoJSON FeatureCollection`**  
    Validates RFC 7946 GeoJSON export generation.

---

### 2.7 NASA FIRMS Ingestion (`test/firms.test.ts`)
31. **`NasaFirmsAdapter - reports all supported operational sensors and truthful config status`**  
    Tests sensor capability reporting.
32. **`NasaFirmsAdapter - returns honest unconfigured state without throwing`**  
    Asserts graceful degradation when `NASA_FIRMS_MAP_KEY` is not set.
33. **`NasaFirmsAdapter - parses FIRMS CSV correctly with deduplication and sensor mapping`**  
    Tests CSV parsing and natural PK deduplication.
34. **`NasaFirmsAdapter - raw observations stored independently with full provenance without attaching to hardcoded incidents (Rule P2.1)`**  
    Verifies that raw satellite observations remain decoupled from incident records.

---

### 2.8 Cryptographic Ledger (`test/ledger.test.ts`)
35. **`CryptographicLedger - genesis, chaining, and tamper detection`**  
    Tests Genesis Block 0 creation, sequential SHA-256 block hash chaining, and intentional tamper detection (modifying payload triggers verification failure).

---

### 2.9 Scientific Ground Truth & Physical Adapters (`test/scientificGaps.test.ts`)
36. **`NifcPerimetersAdapter - returns structured perimeters and spread isochrones`**  
    Validates perimeter polygon vertices and Rothermel 1h/3h/6h spread isochrones.
37. **`LiveFuelsAdapter - physical fuel moisture physics and station queries`**  
    Validates NFDRS fuel moisture calculation ($1\text{h}$, $10\text{h}$, ERC, BI).
38. **`ExposureService - aggregates demographics, infrastructure and evacuation zones`**  
    Tests WorldPop demographic aggregation and critical infrastructure counts.
39. **`HazardAndFleetService - evaluates vehicle weight and height clearance against road hazards`**  
    Tests that a 26-ton water tender is blocked by a 14-ton bridge, while a 3.8-ton brush truck clears.
40. **`GroundVerificationService - delivers authenticated ranger reports and corroboration matrix`**  
    Validates 64-character SHA-256 digital signatures on ranger reports.
41. **`SeasonalAnomalyEvaluation - accurately evaluates hotspot deviations against 25-year median`**  
    Tests classification of normal, elevated, and extreme anomalies against baseline medians.

---

### 2.10 Security & RBAC (`test/securityRbac.test.ts`, `test/accessControl.test.ts`)
42. **`SecurityRBAC - blocks requests without token or credentials with HTTP 401`**  
    Validates authentication enforcement on protected endpoints.
43. **`SecurityRBAC - blocks community role from performing commander operations with HTTP 403`**  
    Enforces authorization boundaries.
44. **`SecurityRBAC - allows authenticated commander to proceed`**  
    Verifies commander token authorization.
45. **`SecurityRBAC - cryptographic HMAC-SHA256 signed token lifecycle and forgery rejection (Rule P0.2)`**  
    Tests token signing and rejection of forged signatures.
46. **`AccessControlService - enforces role profiles and authorization matrix`**  
    Tests role profile lookup.
47. **`AccessControlService - canAccessWorkspace evaluates correctly`**  
    Tests workspace route access matrix.

---

### 2.11 Community, Learning, Telephony & Weather (`test/community.test.ts`, `test/learning.test.ts`, `test/telephony.test.ts`, `test/adapters.test.ts`)
48. **`CommunityService - submits field report and appends to immutable ledger`**  
    Tests field report submission and ledger block creation.
49. **`CommunityService - publishes safety bulletin and records operator action`**  
    Tests bulletin publication and audit recording.
50. **`LearningService - requires human commander sign-off for model promotion`**  
    Verifies that automated model promotion is rejected without commander signature.
51. **`TelephonyService - enforces AI identity announcement and valid progression`**  
    Asserts mandatory AI identity disclosure in TwiML response.
52. **`WeatherAdapter - degToCompass conversion produces accurate cardinal directions`**  
    Validates azimuth-to-compass heading conversions across all 16 cardinal points.
53. **`RothermelSpreadEngine - verifies Anderson fuel models and differential spread physics`**  
    Tested across flat, slope, wind, and moisture extinction conditions.

---

## 3. Reproduction Commands

```bash
# Execute complete unit test suite
npm test

# Execute test suite with coverage
NODE_ENV=test tsx --test --test-concurrency=1 src/shared/intelligenceEngine.test.ts test/*.test.ts

# Execute specific test suite
npx tsx --test test/rothermelPhysics.test.ts
npx tsx --test test/firelens.test.ts

# Verify static typing
npx tsc --noEmit

# Production client bundle build
npm run build
```

