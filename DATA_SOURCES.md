# ALEX Earth Observation Data Sources Registry

**Platform Version**: 2.7.0  
**Challenge**: NASA Space Apps Challenge — Harmonization of MODIS and VIIRS Hot Spots  
**Standard**: NASA ESDIS, CEOS-WGCV, OGC GeoTIFF/CRS84 Standards  
**Policy**: Strict Data Integrity — Zero Synthetic Fallbacks, Genuine Source Identification

---

## 1. Primary Active-Fire Hotspot Products (NASA FIRMS)

### 1.1 MODIS Collection 6.1 Active Fire Product (MOD14 / MYD14 / MOD14NRT)
- **Platforms**: Terra (EOS AM-1, 10:30 AM / 22:30 PM descending node nominal, drifting to ~09:05 AM) & Aqua (EOS PM-1, 13:30 PM / 01:30 AM ascending node).
- **Nominal Resolution**: 1.0 km at nadir; expands up to ~4.8 km in scan and ~2.0 km in track at $\pm 55^\circ$ swath edge (Bowtie effect).
- **Spectral Channels**:
  - Band 21 (4.0 $\mu\text{m}$, saturation ~500 K) / Band 22 (4.0 $\mu\text{m}$, saturation ~331 K) for high-temperature thermal anomaly detection.
  - Band 31 (11.0 $\mu\text{m}$) for background brightness temperature subtraction.
- **Fire Radiative Power (FRP)**: Estimated via Wooster et al. (2003) empirical MIR radiance method:
  $$\text{FRP} = \left(\frac{A_{\text{pix}}}{\sigma}\right) a \left(L_{21} - \bar{L}_{21,\text{bg}}\right)$$
  where $A_{\text{pix}}$ is the viewing-geometry expanded pixel area ($\text{km}^2$).
- **Confidence Metric**: Native integer scalar (0–100%) indicating radiometric signal-to-noise ratio and background contrast. Preserved natively.

### 1.2 VIIRS 375m Active Fire Product (VNP14IMG / VJ114IMG / VJ214IMG)
- **Platforms**: Suomi-NPP (2012–present), NOAA-20 (JPSS-1, 2018–present), NOAA-21 (JPSS-2, 2024–present).
- **Nominal Resolution**: 375 m at nadir; constrained to $\le 750\text{ m}$ at swath edge via onboard 3:1/2:1 pixel aggregation.
- **Spectral Channels**:
  - Band I4 (3.74 $\mu\text{m}$) for fine thermal anomaly identification (saturation ~367 K).
  - Band I5 (11.45 $\mu\text{m}$) for background thermal contrast.
  - Dual-gain Band M13 (4.05 $\mu\text{m}$, saturation ~634 K) used for un-saturated FRP retrieval on intense fires.
- **Confidence Metric**: Categorical classes (`low`, `nominal`, `high`). Preserved natively; **never** converted into synthetic percentages.

### 1.3 VIIRS 750m Continuity Active Fire Product (VNP14 / VJ114)
- **Heritage**: Algorithmic continuity bridge directly inheriting MODIS C6 algorithm logic onto VIIRS M-bands (M13 4.05 $\mu\text{m}$ and M15 10.7 $\mu\text{m}$).
- **Nominal Resolution**: 750 m constant pixel footprint across entire swath width ($3000\text{ km}$).
- **Role in ALEX**: Serves as the intermediate continuity layer bridging MODIS 1 km and VIIRS 375 m spatial resolution disparities.
- **Operational Availability**: Standard science archive product from NASA LAADS DAAC. Marked `AWAITING_ARCHIVE_PIPELINE` in real-time NRT feed.

---

## 2. Multi-Decadal Historical Archives & Baselines

| Product Identifier | Sensor / Platform | Baseline Temporal Span | Archive Provider | Format | Status in ALEX |
|---|---|---|---|---|---|
| **MODIS C6.1 Archive** | Terra / Aqua | Nov 2000 – Present | NASA FIRMS / LP DAAC | CSV / GeoTIFF | Ingestion Ready |
| **VIIRS VNP14IMG Archive** | Suomi-NPP | Jan 2012 – Present | NASA FIRMS / LP DAAC | CSV / GeoTIFF | Ingestion Ready |
| **VIIRS VJ114IMG Archive** | NOAA-20 (JPSS-1) | Jan 2018 – Present | NASA FIRMS / LP DAAC | CSV / GeoTIFF | Ingestion Ready |
| **VIIRS VJ214IMG Archive** | NOAA-21 (JPSS-2) | Jan 2024 – Present | NASA FIRMS / LP DAAC | CSV / GeoTIFF | Ingestion Ready |
| **VIIRS VNP14 750m Continuity** | Suomi-NPP | 2012 – Present | NASA LAADS DAAC | HDF5 / NetCDF | Catalogued |

---

## 3. Contextual Environmental & Auxiliary Datasets

### 3.1 Numerical Weather Prediction (NWP)
- **Source**: Open-Meteo High-Resolution Weather API / ECMWF IFS & GFS.
- **Parameters**: 2m Temperature, Relative Humidity, 10m Wind Speed, Wind Direction ($^\circ$), Precipitation, Surface Pressure.
- **Spatiotemporal Matching**: Dynamic interpolation to observation geographic centroid and acquisition epoch.
- **Integrity Rule**: Real-time HTTP queries with strict fail-closed error handling. Synthetic defaults (e.g. 30°C/25% RH) strictly eradicated.

### 3.2 Orbital Ephemerides & Two-Line Element (TLE) Sets
- **Source**: CelesTrak / Space-Track authoritative NORAD catalogue.
- **Platforms Tracked**: Terra (NORAD 25994), Aqua (NORAD 27424), Suomi-NPP (NORAD 37849), NOAA-20 (NORAD 43013), NOAA-21 (NORAD 54234).
- **Propagation Model**: Simplified General Perturbations-4 (SGP4) analytical propagator with $J_2$ zonal harmonic gravitational oblateness modeling.

### 3.3 Incident Claims & Humanitarian Bulletins
- **Source**: GDELT Project v2 API (`api.gdeltproject.org/api/v2/doc/doc`).
- **Nature of Data**: Unverified external textual claims. Preserved strictly as `unverified_claim` until authority corroboration.
- **Geographic Policy**: Bound dynamically to queried coordinates; never defaulted to a fixed regional anchor.
