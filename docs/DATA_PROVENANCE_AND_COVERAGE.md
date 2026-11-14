# FIRELENS DATA PROVENANCE & COVERAGE MANIFEST
**NASA Space Apps Challenge 2026: Harmonization of MODIS and VIIRS Hot Spots**
**Document ID**: MANIFEST-DATA-PROVENANCE-2026-v3  
**Status**: Certified Open Science Data Release  

---

## 1. Study Area of Interest (AOI) Definition

- **Region Name**: Nilgiris Biosphere Reserve & Western Ghats Foothills
- **Identifier**: `REG-NILGIRI` / `AOI-NILGIRIS-BHAVANI`
- **Bounding Box Coordinates (WGS84)**:
  - Minimum Longitude: $76.2000^\circ\text{E}$
  - Maximum Longitude: $77.3000^\circ\text{E}$
  - Minimum Latitude: $11.0000^\circ\text{N}$
  - Maximum Latitude: $12.0000^\circ\text{N}$
  - Total Area: $\sim 12,300\text{ km}^2$
- **Biophysical Characteristics**:
  - Dominant Biomes: Tropical moist deciduous, montane shola-grassland, dry thorn forest.
  - Core Protected Reserves: Mudumalai Tiger Reserve, Bandipur Border, Silent Valley National Park, Wayanad Wildlife Sanctuary, Bhavani River Basin.
  - Annual Climatological Fire Season: January through April (peaking February–March).

---

## 2. Ingested Data Manifest & Storage Files

| File Path | Description | Format | Record Count | File Size | SHA-256 Checksum |
|:---|:---|:---:|:---:|:---:|:---|
| [data/firelens_nilgiris_2019_2026.json](file:///home/justin/Desktop/NASA/data/firelens_nilgiris_2019_2026.json) | Canonical empirical active fire archive | JSON | 13,065 | 15.2 MB | `7c84f18d09e5e791b897e937d121bc19e782c58e5f1b1451fbc446ea9671d491` |
| [data/firelens_nilgiris_2019_2026.csv](file:///home/justin/Desktop/NASA/data/firelens_nilgiris_2019_2026.csv) | Reproducible scientific research CSV | CSV | 13,066 lines | 3.0 MB | `e415a770514138e92f254e0c4e7da3c09f3e4933a907573d84a77bc40b12ca51` |
| [data/firelens_validation_mcd64a1.json](file:///home/justin/Desktop/NASA/data/firelens_validation_mcd64a1.json) | NASA MCD64A1 Burned Area monthly series | JSON | 24 | 14.8 KB | `829a8a7353b3dfa3bf879eb94c3c3eef512df8b108e4389cb43f1e9447e44a49` |
| [data/nilgiris_empirical_monthly.json](file:///home/justin/Desktop/NASA/data/nilgiris_empirical_monthly.json) | Aggregated monthly empirical climatology | JSON | 24 | 18.2 KB | `2bb69a83d735071dfb689df94faeb09c48b4886616089304bb7291aef1729cc5` |

---

## 3. Satellite Sensor Breakdown across 13,065 Canonical Records

| Satellite Platform | Sensor Instrument | Native Resolution | Temporal Availability | Monitored Detections | Share (%) |
|:---|:---|:---:|:---:|:---:|:---:|
| **Terra (EOS AM-1)** | MODIS (MOD14) | 1.0 km nadir | 2019–2026 | 587 | 4.5% |
| **Aqua (EOS PM-1)** | MODIS (MYD14) | 1.0 km nadir | 2019–2026 | 685 | 5.2% |
| **Suomi-NPP** | VIIRS (VNP14IMG) | 375 m nadir | 2019–2026 | 4,732 | 36.2% |
| **NOAA-20 (JPSS-1)** | VIIRS (VJ114IMG) | 375 m nadir | 2019–2026 | 4,625 | 35.4% |
| **NOAA-21 (JPSS-2)** | VIIRS (VJ214IMG) | 375 m nadir | Mar 2023–2026 | 2,436 | 18.7% |
| **Total Canonical Records** | — | — | **2019–2026** | **13,065** | **100.0%** |

---

## 4. Viewing Geometry & Zenith Distribution

| Viewing Zenith Angle Bin | Angular Range | Footprint Area Expansion | Observations in AOI | Fraction (%) |
|:---|:---:|:---:|:---:|:---:|
| **Nadir Bin** (`nadir_0_20`) | $0^\circ \le \theta < 20^\circ$ | $1.0\times – 1.3\times$ | 8,368 | 64.1% |
| **Mid-Swath Bin** (`mid_20_45`) | $20^\circ \le \theta < 45^\circ$ | $1.3\times – 2.4\times$ | 3,982 | 30.5% |
| **Limb Swath Bin** (`limb_45_65`) | $45^\circ \le \theta \le 65^\circ$ | $2.4\times – 9.6\times$ (MODIS) | 715 | 5.4% |

---

## 5. Compliance with NASA Space Apps Zero-Mock Mandate

1. **Active Science Pipelines**: All calculations in `decomposeObservingEffort()`, `computeYearlySensorSummaries()`, and the 4-Tier Reconciliation Engine operate exclusively on [data/firelens_nilgiris_2019_2026.json](file:///home/justin/Desktop/NASA/data/firelens_nilgiris_2019_2026.json).
2. **Quarantine of Synthetic Records**: The legacy 1,248-record pseudo-archive is isolated from production rendering. `useArchiveBaseline` defaults to `false` across all views.
3. **Transparent Notices**: When user selects exploratory simulation tabs (perimeters, fuels, exposure), `ProvenanceNoticeBanner` displays an explicit notice clarifying that the data represents an illustrative simulation benchmark.
