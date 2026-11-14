# ALEX Scientific Foundations & Methodological Principles

**Platform Version**: 2.7.0  
**Domain**: Autonomous Earth Observation, Active-Fire Harmonisation & Physical Environmental Modeling  
**Compliance Standard**: NASA Earth Science Data and Information System (ESDIS) & Open Geospatial Consortium (OGC)

---

## 1. Multi-Sensor Active-Fire Harmonisation (MODIS & VIIRS)

### 1.1 Three-Level Resolution Disparity & Bowtie Effect
- **Level 1 — MODIS (Terra/Aqua)**: Nominal spatial resolution is 1.0 km at nadir, expanding to ~4.8 km in scan and ~2.0 km in track at the swath edge ($\pm 55^\circ$ scan angle).
- **Level 2 — VIIRS 750m Continuity Product (VNP14 / VJ114)**: M-band active fire product inheriting MODIS Collection 6 algorithmic logic, maintaining constant 750 m resolution across entire swath. Serves as continuity baseline.
- **Level 3 — VIIRS 375m High-Resolution Product (VNP14IMG / VJ114IMG / VJ214IMG)**: Nominal spatial resolution for I-band thermal anomalies is 375 m at nadir. VIIRS employs onboard pixel aggregation (3:1 nadir, 2:1 intermediate, 1:1 edge) constraining swath-edge expansion to $\le 750\text{ m}$.

### 1.2 Footprint Geometry & Spatial Association Ellipses
Instead of naive fixed-radius Euclidean clustering (which artificially merges distinct fires or splits wide-scan observations), detection association models the ground projection of the instantaneous field of view (IFOV) as an ellipse:

$$a = \frac{\text{scanPixelKm} \times 1000}{2}, \quad b = \frac{\text{trackPixelKm} \times 1000}{2}$$

Two detections $\mathbf{x}_1$ and $\mathbf{x}_2$ belong to the same active thermal event hypothesis if their spatial geodesic separation $D_{12}$ is bounded by the sum of their semi-major footprint axes:

$$D_{12} \le \sqrt{a_1^2 + b_1^2} + \sqrt{a_2^2 + b_2^2}$$

```
MODIS Nadir (1.0 x 1.0 km)        VIIRS Nadir (0.375 x 0.375 km)
       +--------+                             +--+
       |        |                             |  |
       |        |                             +--+
       +--------+

MODIS Edge (4.8 x 2.0 km)         VIIRS Edge (0.75 x 0.75 km)
+-----------------------------------+         +----+
|                                   |         |    |
+-----------------------------------+         +----+
```

### 1.3 Fire Radiative Power (FRP) Integration & Multi-Temporal Integrity
Fire Radiative Power (FRP) represents instantaneous radiant energy output in Megawatts (MW):
- **Pass Independence**: Detections from different orbital passes (different times of day or satellite overflights) represent distinct thermodynamic states and are preserved as separate time-series records. ALEX **never** averages FRP across distinct passes.
- **Total Energy Distinction**: ALEX **never** calculates total fire energy by multiplying detection count by mean FRP. FRP is instantaneous power ($\text{J/s}$); energy estimation requires time-integration with adequate temporal sampling:
  $$E_{\text{fire}} = \int_{t_{\text{start}}}^{t_{\text{end}}} \text{FRP}(t) \, dt$$
  When continuous temporal sampling is unavailable, total energy is reported as `UNAVAILABLE` rather than fabricated.
- **Cross-Sensor Synchronous Co-location**: Synchronous or near-synchronous cross-sensor clusters (e.g. NOAA-20 and Suomi-NPP flying within 50 minutes of each other) maintain sensor-specific FRP values alongside peak cluster FRP.

---

## 2. Satellite Orbital Mechanics & SGP4 Perturbation

### 2.1 SGP4 (Simplified General Perturbations-4) Propagation
ALEX propagates Earth-observation platforms using standardized NORAD Two-Line Element (TLE) sets and the analytical SGP4 propagator (`satellite.js`):
- **Perturbation Forces**: Accounts for Earth oblateness ($J_2, J_3, J_4$), atmospheric drag via the ballistic drag coefficient ($B^*$), and gravitational lunisolar third-body effects.
- **Coordinate Transformations**:
  1. Computes satellite position and velocity in True Equator, Mean Equinox (TEME) inertial coordinates.
  2. Evaluates Greenwich Mean Sidereal Time (GMST) at Julian epoch $t$.
  3. Converts TEME vectors to geodetic latitude, longitude, and ellipsoidal altitude using the WGS-84 reference ellipsoid ($a = 6378.137\text{ km}, f = 1/298.257223563$).

### 2.2 Low Earth Orbit (LEO) vs Geostationary (GEO) Differentiation
- **LEO Sun-Synchronous Constellation** (Terra, Aqua, Suomi-NPP, NOAA-20, NOAA-21):
  - Altitude: ~705 km (Terra/Aqua) to ~824 km (VIIRS).
  - Inclination: $98.2^\circ$ to $98.7^\circ$ retrograde.
  - Orbital Period: ~99 to 101 minutes (~14.2 orbits/day).
  - Ground Track: Repeating ground track with daily global coverage in daytime and nighttime passes.
- **Geostationary Monitors** (GOES-East / GOES-16, GOES-West / GOES-18, Himawari-9):
  - Altitude: ~35,786 km above the equator ($i \approx 0^\circ$).
  - Period: 1 sidereal day (~1436 minutes), matching Earth rotation.
  - Sub-satellite Point: Station-kept at fixed longitudes (GOES-East at $75.2^\circ\text{W}$, Himawari-9 at $140.7^\circ\text{E}$).
  - Cadence: Rapid full-disk refreshes every 10 minutes, CONUS/regional mesoscale scans every 1-5 minutes.

### 2.3 Terra Orbital Drift Science & Diurnal Solar Sampling
- **Orbital History**: Launched in December 1999 into a 705 km sun-synchronous orbit with an equatorial crossing time of 10:30 AM (descending).
- **Inclination Maneuver Depletion**: In February 2020, orbital inclination maintenance ceased to preserve remaining propellant. In October 2022, Terra executed an orbital lowering maneuver to 694 km to clear the Morning Constellation.
- **MLST Shift**: Terra's descending equatorial crossing time has drifted earlier from 10:30 AM to ~09:05 AM descending.
- **Physical Impact on Active-Fire Detection**: Wildfire thermal radiation exhibits an asymmetric diurnal profile driven by ambient temperature, solar heating, relative humidity minimums, and local winds, typically peaking between 13:00 and 15:00 local solar time. Morning observations at 09:00 AM capture an inherently cooler fire state than observations at 10:30 AM or afternoon passes.
- **Integrity Rule**: ALEX strictly prohibits applying speculative, fixed mathematical attenuation coefficients (e.g. ~39% reduction). Instead, diurnal shifts are analyzed against empirical solar time distributions and reported with confidence intervals.

---

## 3. Observation Opportunity & Effort Denominator

### 3.1 Hotspot Counts are Not Observation-Independent
A satellite cannot detect a fire if:
1. The satellite is not overhead (temporal gap between passes).
2. The ground pixel is heavily cloud-obscured (attenuation of 4 $\mu\text{m}$ radiance).
3. The fire front is positioned near swath edge where pixel footprint expands $10\times$ in ground area.

### 3.2 Exposure-Adjusted Activity Analysis
To determine whether an apparent trend represents real burning or changes in observation effort:
- ALEX models valid overpass opportunities across the queried Area of Interest.
- When cloud-mask or orbital overpass grids are unavailable, the coverage denominator is explicitly reported as `UNAVAILABLE` rather than inventing a default coverage percentage.

---

## 4. Empirical Burning Activity Calendar Methodology

### 4.1 Strict Regional Bounds & Zero-Fallback Policy
- Burning activity statistics are calculated exclusively from real, empirical observation records bounded by the queried Area of Interest (AOI):
  $$\text{AOI} = [\text{lon}_{\min}, \text{lat}_{\min}, \text{lon}_{\max}, \text{lat}_{\max}]$$
- **Zero Cross-Region Fallback**: If an unpopulated geographical bounding box or remote polygon is queried, ALEX returns an honest empty dataset ($N = 0$, historical median = null). The system never substitutes data from adjacent states, global averages, or unrelated fire regimes.

### 4.2 Statistical Aggregation & Non-Parametric Metrics
- **Metric Formulation**:
  1. $N_{\text{MODIS}}$ and $N_{\text{VIIRS}}$: Discrete raw sensor detection counts.
  2. $N_{\text{harmonized}}$: Spatially clustered footprint thermal events.
  3. $\text{FRP}_{\text{mean}}$ and $\text{FRP}_{\text{p90}}$: Mean and 90th percentile Fire Radiative Power (MW) across validated observations.
  4. $\text{Median}_{\text{hist}}$: Non-parametric 25-year median (2000–2025) baseline for the specific calendar month, computed via `computeEmpiricalMonthlyClimatology()`.
  5. $\text{Anomaly}_{\%}$: Multi-year anomaly percentage calculated as $\frac{N_{\text{current}} - \text{Median}_{\text{hist}}}{\max(\text{Median}_{\text{hist}}, 1)} \times 100\%$.
- **Export Formats**: Standardized CSV with scientific column headers and RFC 7946 GeoJSON FeatureCollections with CRS84 spatial coordinates.
