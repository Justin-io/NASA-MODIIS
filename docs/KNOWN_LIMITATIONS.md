# FIRELENS KNOWN SCIENTIFIC & TECHNICAL LIMITATIONS
**NASA Space Apps Challenge 2026: Harmonization of MODIS and VIIRS Hot Spots**
**Document ID**: LIMITATIONS-2026-v3  
**Status**: Transparent Technical Disclosure  

---

## 1. Scientific Disclosures

In accordance with scientific integrity standards, this document explicitly details the physical, sensor, algorithmic, and operational boundaries of the **FireLens** platform.

---

## 2. Sensor & Observing System Boundaries

### 2.1 Low Earth Orbit (LEO) Temporal Sampling Gaps
- **Description**:
  The active fire constellation analyzed (Terra, Aqua, Suomi-NPP, NOAA-20, NOAA-21) operates in sun-synchronous polar Low Earth Orbits (~705–824 km altitude).
- **Physical Consequence**:
  Each satellite provides at most two observing opportunities per 24 hours (one daytime, one nighttime). Across the 5-satellite constellation, nominal revisit frequency is 4–6 passes per day over equatorial and mid-latitude regions.
- **Limitation**:
  Fast-moving grass fires, agricultural stubble burning, or flash wildfires that ignite, peak, and extinguish between passes (~09:30–12:30 or ~15:30–21:00 LST) cannot be observed by LEO polar orbiters. Geostationary active fire sensors (e.g. INSAT-3D/3DR, Meteosat SEVIRI, GOES ABI) provide 10–15 minute revisit capability but at significantly coarser spatial footprints (2–4 km nadir).

### 2.2 Cloud, Thick Smoke, and Pyrocumulonimbus Omission
- **Description**:
  Active fire detection algorithms (MOD14, VNP14IMG) rely on mid-infrared (MIR, ~3.9–4.0 µm) and thermal infrared (TIR, ~11.0 µm) radiance.
- **Physical Consequence**:
  Thick meteorological clouds (monsoon stratus, cumulonimbus) and dense pyrocumulonimbus smoke plumes completely attenuate thermal emissions.
- **Limitation**:
  Detections during the monsoon season (June–August in Western Ghats) exhibit elevated false-negative omission rates. FireLens explicitly flags these pixels as `qaCloudFlag = 'cloud_occluded'` rather than assuming zero burning.

### 2.3 Canopy Thermal Attenuation in Dense Tropical Biomes
- **Description**:
  In dense evergreen and semi-evergreen forest canopies (such as the Silent Valley and Nilgiris moist deciduous zones), the tree canopy absorbs a significant fraction of understory radiant heat.
- **Physical Consequence**:
  Low-intensity ground and creep fires with FRP < 5 MW are frequently attenuated below MODIS detection thresholds (~8–10 MW).
- **Limitation**:
  The observed ~9.8:1 ratio of VIIRS to MODIS detections in Nilgiris is heavily driven by this sub-canopy sensitivity differential. Users must account for biome-specific canopy coverage when extrapolating to open savannas or boreal forests.

---

## 3. Algorithmic & Model Boundaries

### 3.1 MCD64A1 Active-Fire Seed Co-Dependence
- **Description**:
  MCD64A1 is utilized as an independent ground truth burned area product to validate active-fire harmonization.
- **Algorithmic Nuance**:
  The MCD64A1 regional algorithm uses 500 m MODIS surface reflectance changes, but identifies candidate burn scars using MODIS active-fire (MOD14) thermal anomalies as initial *seed pixels*.
- **Limitation**:
  MCD64A1 cannot be claimed as an *entirely independent* ground truth. While reflectance changes confirm actual physical scarring on the surface, algorithmic seed co-dependence creates a baseline correlation with active fire detections.

### 3.2 Rothermel Surface Spread Uniformity Assumptions
- **Description**:
  The implemented Rothermel (1972) wildland fire spread engine assumes a continuous, homogeneous, uniform fuel bed within each Anderson fuel model class.
- **Physical Limitation**:
  Real-world wildland fires exhibit complex non-uniformities:
  - Spotting (ember transport lofted by convective smoke plumes ahead of the main flame front).
  - Crown fire transition (spread through tree crowns independent of surface fuels).
  - Fuel moisture spatial heterogeneity due to microclimatic terrain shielding.
- **Recommended Use**:
  The Rothermel engine provides accurate forward surface spread projections, but tactical commanders must treat projections as deterministic physical baselines, not guarantees of chaotic spotting.

---

## 4. Operational Boundaries

### 4.1 Atmospheric Reanalysis Latency
- Numerical Weather Prediction (NWP) feeds from Open-Meteo operate on a 1-hour to 3-hour model run latency. Micro-scale wind shifts caused by localized fire-induced convective storms are not captured until station observations report.

### 4.2 Study Area Generalization
- The empirical archive and parameter calibration are optimized for the **Nilgiris Biosphere Reserve** (Western Ghats, India). Applying the exact observation effort multiplier ($E(t) = 3.1$) to different biomes (e.g. Pantanal wetlands or boreal taiga) requires regional recalibration of fuel density, cloud opportunity fractions, and canopy attenuation factors.
