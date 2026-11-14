# FIRELENS SCIENTIFIC AUDIT — 08: REFERENCE VALIDATION & MCD64A1 AUDIT
**NASA Space Apps Challenge 2026: Harmonization of MODIS and VIIRS Hot Spots**
**Audit Date**: November 14, 2026  
**Auditor**: Earth Observation Research Scientist  
**Status**: Certified Independent Reference Audit  

---

## 1. Audit of the MCD64A1 Burned Area Reference Product

- **Product Identity**: NASA LP DAAC MCD64A1 Collection 6.1 (MODIS 500m Monthly Burned Area).
- **Spatial Resolution**: 500 meters grid.
- **Temporal Resolution**: Monthly composite raster.
- **Reference Dataset**: 24 monthly periods across 8 years (2019–2026, February through April) in [data/firelens_validation_mcd64a1.json](file:///home/justin/Desktop/NASA/data/firelens_validation_mcd64a1.json).

---

## 2. Independent Recalculation of Concordance ($R^2$)

### 2.1 Annual Aggregation ($N = 8$ Years)

| Pair Type | Correlation ($r$) | Coefficient of Determination ($R^2$) | Regression $p$-value | Reported Value | Audit Verdict |
|:---|:---:|:---:|:---:|:---:|:---|
| **Raw Hotspots vs. MCD64A1 Area (ha)** | +0.474 | **0.225** | $p = 0.235$ | $0.420$ | **DISPROVED / REJECTED** (Reported fallback constant) |
| **Effort-Adjusted Rate vs. MCD64A1 Area (ha)** | +0.347 | **0.120** | $p = 0.399$ | $0.860$ | **DISPROVED / REJECTED** (Reported fallback constant) |

### 2.2 Monthly Aggregation ($N = 24$ Months)

| Pair Type | Correlation ($r$) | Coefficient of Determination ($R^2$) | Regression $p$-value | Audit Verdict |
|:---|:---:|:---:|:---:|:---|
| **Monthly Raw Hotspots vs. MCD64A1** | +0.516 | **0.266** | $p = 0.010$ | Statistically significant moderate correlation |
| **Monthly Adjusted Rate vs. MCD64A1** | +0.449 | **0.202** | $p = 0.028$ | Statistically significant moderate correlation |

---

## 3. Remote Sensing Root Cause: Why Hotspots and Burned Area Diverge

1. **Measurement Domain Mismatch**:
   - **Active Fire Hotspots (MOD14 / VNP14IMG)**: Capture *instantaneous flaming combustion* during a 10-second orbital snapshot. A single rapid crown fire front can produce 40 detections in 2 hours and extinguish.
   - **MCD64A1 Burned Area**: Measures *persistent post-fire surface reflectance changes* (decreases in near-infrared and increases in shortwave infrared due to char and ash deposition) accumulated over days and weeks.
2. **Understory Smoldering vs. Flaming Combustion**:
   - In the moist deciduous forest belts of Mudumalai and Silent Valley, understory ground fires frequently burn extensive surface area under dense canopies. The canopy absorbs radiant heat, preventing active fire detection, but subsequent leaf scorching and ground char register strongly in 500m reflectance change products.
3. **The 2023 Discrepancy**:
   - In 2023, extreme landscape fires burned **5,220 hectares** (the highest burned area in the 8-year record).
   - However, after applying the 2023 effort multiplier ($E = 3.851$, including NOAA-21), adjusted hotspots were only **589**.
   - Pairing 589 adjusted hotspots with 5,220 hectares severely penalizes linear correlation ($R^2 = 0.120$).

---

## 4. Algorithmic Seed Co-Dependence Disclosure

MCD64A1 is an independent spectral product, but its region-growing algorithm utilizes MODIS thermal anomalies (MOD14) as **contextual seed pixels**:
- High-confidence active fire pixels are used to seed the burn-scar region growing algorithm.
- Therefore, MCD64A1 is **not 100% sensor-independent** of active-fire observing systems.
- Its correlation with active fire counts reflects both real physical surface scarring and partial algorithmic co-dependence.

---

## 5. Additional Reference Sources Audit

- **Sentinel-2 & Landsat-8/9 Interpretation**:
  - Higher resolution (10–30 m) burned area products (e.g. Landsat Burned Area Product, Sentinel-2 Level-2A NBRDifferenced composites) offer finer spatial resolution but have longer revisit intervals (5–16 days).
  - High cloud cover in the Western Ghats limits usable cloud-free scenes.
- **Authoritative Ground Perimeters**:
  - Forest Department ranger boundary perimeters for Nilgiris are preserved in the ground verification service, but exist as discrete incident reports rather than continuous gridded rasters.
- **Audit Mandate**: FireLens must transparently report the true empirical $R^2 \approx 0.20–0.27$ and eliminate all promotional claims of $R^2 = 0.860$.

