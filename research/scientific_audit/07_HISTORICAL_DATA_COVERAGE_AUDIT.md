# FIRELENS SCIENTIFIC AUDIT — 07: HISTORICAL DATA COVERAGE AUDIT
**NASA Space Apps Challenge 2026: Harmonization of MODIS and VIIRS Hot Spots**
**Audit Date**: November 14, 2026  
**Auditor**: Geospatial Data Engineer & Independent Quality Lead  
**Status**: Certified Empirical Coverage Manifest  

---

## 1. Verified Sensor-by-Sensor Coverage Matrix

Calculated directly from all 13,065 observations in [data/firelens_nilgiris_2019_2026.json](file:///home/justin/Desktop/NASA/data/firelens_nilgiris_2019_2026.json):

| Satellite Platform | Sensor Instrument | Native Footprint | Earliest Valid Date | Latest Valid Date | Active Years | Active Months | Record Count | Share of Total |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Terra (EOS AM-1)** | MODIS (MOD14) | 1.0 km nadir | 2019-02-15 05:32:00 | 2026-04-24 05:15:00 | 2019–2026 (8 yrs) | Feb, Mar, Apr | **305** | 2.33% |
| **Aqua (EOS PM-1)** | MODIS (MYD14) | 1.0 km nadir | 2019-02-15 08:15:00 | 2026-04-24 08:30:00 | 2019–2026 (8 yrs) | Feb, Mar, Apr | **500** | 3.83% |
| **Suomi-NPP** | VIIRS (VNP14IMG) | 375 m nadir | 2019-02-15 08:12:00 | 2026-04-25 08:10:00 | 2019–2026 (8 yrs) | Feb, Mar, Apr | **5,033** | 38.52% |
| **NOAA-20 (JPSS-1)** | VIIRS (VJ114IMG) | 375 m nadir | 2019-02-15 07:45:00 | 2026-04-25 07:42:00 | 2019–2026 (8 yrs) | Feb, Mar, Apr | **4,964** | 37.99% |
| **NOAA-21 (JPSS-2)** | VIIRS (VJ214IMG) | 375 m nadir | 2023-03-01 08:35:00 | 2026-04-25 08:32:00 | 2023–2026 (4 yrs) | Feb, Mar, Apr | **2,263** | 17.32% |
| **Total Canonical Observations** | — | — | **2019-02-15** | **2026-04-25** | **8 Years** | **3 Months/yr** | **13,065** | **100.00%** |

---

## 2. Critical Audit Findings on Data Coverage

### 2.1 Seasonal Scope Clarification
- **Audit Finding**: In all 8 years (2019–2026), observations strictly span **February 15 through April 25**.
- **Ecological Reason**: In the Western Ghats (Nilgiris Biosphere Reserve), burning is strongly climatologically concentrated in the late dry season (February to April). May brings pre-monsoon showers, and June–September brings the intense southwest monsoon, where cloud cover exceeds $90\%$ and wildland fires are virtually absent.
- **Documentation Discrepancy Corrected**: Previous documentation described annual statistics as "1,532 / year" without specifying that the records represent the **70-day peak fire season window**. All documentation must explicitly clarify:
  `"Rate per annual peak fire season (February–April)"`.

### 2.2 Reconciling Documentation Checksum Discrepancy
- In `docs/DATA_PROVENANCE_AND_COVERAGE.md`, the SHA-256 hash was documented as:
  `7c84f18d09e5e791b897e937d121bc19e782c58e5f1b1451fbc446ea9671d491`
- The actual computed SHA-256 of `data/firelens_nilgiris_2019_2026.json` (15,560,359 bytes) is:
  `3ba37d331db77d9fa54f0f1845921baa30169c8c76ceaff5579a5b67403f3046`
- **Correction Applied**: Updated the documentation with the verified SHA-256 hash.

### 2.3 Product Collection Versions
- **MODIS**: NASA EOSDIS Collection 6.1 Standard Quality (MOD14 / MYD14).
- **VIIRS Suomi-NPP**: Collection 1 375m Active Fire (VNP14IMG).
- **VIIRS NOAA-20**: Collection 1 375m Active Fire (VJ114IMG).
- **VIIRS NOAA-21**: Collection 2 375m Active Fire (VJ214IMG, operational since March 2023).
- **Burned Area Validation**: NASA LP DAAC MCD64A1 Collection 6.1 (500m Monthly Burned Area).

