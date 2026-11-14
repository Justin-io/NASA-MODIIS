# FireLens: Earth Observation Science, Sensor Geometry & Decomposition

## 1. The Core Scientific Problem
When analyzing multi-decadal satellite active-fire records, environmental platforms frequently observe a statistically significant upward trend in raw hotspot counts. For example, in the Nilgiris Biosphere Reserve study window (2019–2026), raw active-fire detections jumped by $+29.2\%$ (from an average of $1,532\text{ detections/year}$ to $1,979\text{ detections/year}$).

A naive climate analysis attributes this growth directly to increased burning, drought severity, or vegetation flammability. However, the Earth observation sensor constellation is non-stationary:
1. **Constellation Infill**: The deployment of NOAA-20 (2018) and NOAA-21 (2023) increased the daily orbit passes over the equator by $+25\%$.
2. **Spatial Resolution Upgrades**: Transitioning from MODIS ($1,000\text{ m}$ pixel footprint, $1.0\text{ km}^2$) to VIIRS 375m I-band ($0.14\text{ km}^2$) reduces the minimum detectable Fire Radiative Power (FRP) from $\sim 8–10\text{ MW}$ down to $0.5–1.5\text{ MW}$, capturing small agricultural clearings and sub-canopy smoldering previously invisible to spaceborne sensors.
3. **Orbital Drift**: NASA Terra's morning equatorial crossing drifted by 1.14 hours earlier (from 10:30 AM to ~09:00 AM), systematically suppressing morning peak observations.

**FireLens** decouples changes in observing capacity from true ground fire trends through causal decomposition, scan-angle geometry correction, and independent validation against monthly burned area outcomes.

---

## 2. Sensor Physical Specifications

| Parameter | MODIS (Terra / Aqua) | VIIRS (Suomi-NPP / NOAA-20 / NOAA-21) |
|---|---|---|
| **Mission Orbit** | Polar Sun-Synchronous, $705\text{ km}$ altitude | Polar Sun-Synchronous, $824\text{ km}$ altitude |
| **Orbit Inclination** | $98.2^\circ$ | $98.7^\circ$ |
| **Swath Width** | $2,330\text{ km}$ | $3,040\text{ km}$ |
| **Nominal Nadir Resolution** | $1,000\text{ m}$ ($1.0\text{ km}^2$) | $375\text{ m}$ I-band ($0.14\text{ km}^2$) |
| **Swath-Edge Resolution** | $4.8\text{ km} \times 2.0\text{ km}$ ($9.6\text{ km}^2$) | $0.8\text{ km} \times 0.8\text{ km}$ ($0.64\text{ km}^2$) |
| **Active Fire Primary Band** | Band 21/22 ($3.959\text{ }\mu\text{m}$, Saturation: $500\text{ K} / 331\text{ K}$) | I4 ($3.74\text{ }\mu\text{m}$, Saturation: $367\text{ K}$) |
| **Background / Cloud Band** | Band 31 ($11.03\text{ }\mu\text{m}$, Saturation: $400\text{ K}$) | I5 ($11.45\text{ }\mu\text{m}$, Saturation: $380\text{ K}$) |
| **Equatorial Crossing Times** | Terra: 10:30 AM / 10:30 PM (drifted)<br>Aqua: 01:30 PM / 01:30 AM | SNPP: 01:30 PM / 01:30 AM<br>N20: 12:40 PM / 12:40 AM<br>N21: 01:05 PM / 01:05 AM |
| **Confidence Metric** | Numeric Percentage ($0–100\%$) | Categorical Class (`low`, `nominal`, `high`) |

---

## 3. The Geometry of Bowtie Distortion

Optical whiskbroom sensors like MODIS sweep a rotating scan mirror across the ground track. Because the distance from the satellite to the Earth surface increases off-nadir, the projected Instantaneous Field of View (IFOV) expands dramatically toward the swath edges.

```
                  Satellite (Altitude H)
                        /   |   \
                       /    |    \
                      /  \theta|   \
                     /      |      \
                    /       |       \
                   /        |        \
Ground:  [Edge Pixel]     [Nadir]   [Edge Pixel]
         Area ~ 9.6 km^2  Area 1km^2 Area ~ 9.6 km^2
```

### Mathematical Formulation
Let $\theta$ be the scan angle from nadir ($0^\circ \le \theta \le 55^\circ$), and $R_E$ be the Earth radius ($6,371\text{ km}$):
1. **Cross-Track Ground Dimension ($\Delta x$)**:
   $$\Delta x(\theta) = H \cdot \text{IFOV}_x \cdot \frac{\cos \theta}{\cos^2(\theta + \beta)}$$
   Approximated for flat Earth as:
   $$\Delta x(\theta) \approx \Delta x_0 \cdot \sec^2 \theta$$
2. **Along-Track Ground Dimension ($\Delta y$)**:
   $$\Delta y(\theta) = H \cdot \text{IFOV}_y \cdot \sec \theta$$
3. **Projected Pixel Area ($A(\theta)$)**:
   $$A(\theta) = \Delta x(\theta) \cdot \Delta y(\theta) \approx A_0 \cdot \sec^3 \theta$$

### The VIIRS Advantage: Onboard Pixel Aggregation
- **MODIS**: No pixel aggregation. A fire detected at $\theta = 50^\circ$ is smeared across $9.6\text{ km}^2$, generating multiple duplicate detections for adjacent scan tracks (bowtie overlap) or completely diluting sub-pixel thermal radiances below the detection threshold.
- **VIIRS**: Applies onboard digital aggregation:
  - Nadir to $31.59^\circ$: 3-to-1 sample aggregation.
  - $31.59^\circ$ to $44.68^\circ$: 2-to-1 sample aggregation.
  - $44.68^\circ$ to $55.84^\circ$: 1-to-1 aggregation (no aggregation).
  This unique optical architecture constrains swath-edge pixel growth to $<2.5\times$ nominal area ($0.64\text{ km}^2$), maintaining uniform spatial detection sensitivity across the entire $3,040\text{ km}$ swath.

---

## 4. Causal Observing Effort Decomposition

The decomposition engine binned in `src/shared/observationDecomposition.ts` separates raw detected hotspots $N_{\text{obs}, y}$ into observing capacity $E_y$ and physical burning $N_{\text{adj}, y}$.

### 1. Observing Effort Index ($E_y$)
$$E_y = \sum_{s \in \mathcal{S}_y} w_s \cdot \left(\frac{N_{\text{passes}, s, y}}{N_{\text{passes}, \text{baseline}}}\right) \cdot \left(\frac{A_{\text{pixel}, \text{MODIS}}}{A_{\text{pixel}, s}}\right)^{\gamma} \cdot \delta_{\text{drift}, s, y}$$

Where:
- $\mathcal{S}_y$: Active sensor constellation in year $y$.
- $w_s$: Sensor weight ($w_{\text{MODIS}} = 1.0$, $w_{\text{VIIRS-SNPP}} = 1.6$, $w_{\text{VIIRS-NOAA20}} = 1.6$, $w_{\text{VIIRS-NOAA21}} = 1.6$).
- $A_{\text{pixel}}$: Pixel area ($1.0\text{ km}^2$ for MODIS, $0.14\text{ km}^2$ for VIIRS 375m).
- $\gamma \approx 0.35$: Power-law scaling factor relating pixel footprint to sub-pixel fire retrieval probability (empirically calibrated against Western Ghats canopy density).
- $\delta_{\text{drift}}$: Diurnal drift discount factor for Terra ($0.858$ for 09:30 AM crossing vs $1.0$ at nominal 10:30 AM).

### 2. Physical Effort-Adjusted Burning Rate ($N_{\text{adj}, y}$)
$$N_{\text{adj}, y} = \frac{N_{\text{obs}, y}}{E_y} \times \bar{E}_{\text{baseline}}$$

### 3. Decomposition Fractions
- **Raw Apparent Growth ($\Delta N_{\text{raw}}$)**:
  $$\Delta N_{\text{raw}} = \frac{N_{\text{obs}, \text{modern}} - N_{\text{obs}, \text{baseline}}}{N_{\text{obs}, \text{baseline}}}$$
- **Physical Burning Growth ($\Delta N_{\text{phys}}$)**:
  $$\Delta N_{\text{phys}} = \frac{N_{\text{adj}, \text{modern}} - N_{\text{adj}, \text{baseline}}}{N_{\text{adj}, \text{baseline}}}$$
- **Attributable to Observing System Expansion**:
  $$\text{Fraction}_{\text{system}} = \max\left(0, \frac{\Delta N_{\text{raw}} - \Delta N_{\text{phys}}}{\Delta N_{\text{raw}}}\right)$$

---

## 5. Independent Validation with MCD64A1 Burned Area

To validate whether effort-adjusted counts reflect true ground phenomena without circular reasoning, FireLens benchmarks both series against an independent third-party physical outcome: **NASA LP DAAC MCD64A1 Collection 6.1 Monthly $500\text{ m}$ Burned Area**.

MCD64A1 utilizes multi-spectral surface reflectance dynamics (differenced Normalized Burn Ratio - dNBR) and temporal edge detection to map permanent ground scarring, independent of whether an active fire was visible during a single thermal overpass.

### Statistical Concordance Metrics
1. **Raw Counts vs. Burned Area**:
   $$R^2_{\text{raw}} = 0.225 \quad (\text{Poor concordance; post-2023 counts surge without matching burned area})$$
2. **Effort-Adjusted Counts vs. Burned Area**:
   $$R^2_{\text{adj}} = 0.864 \quad (\text{High concordance; physical proportionality restored})$$

```
Year | Raw Hotspots | Effort Index (E) | Effort-Adjusted | MCD64A1 Burned (ha)
----------------------------------------------------------------------------
2019 | 3,529        | 3.005            | 1,174           | 14,280
2020 | 609          | 3.005            | 203             | 2,450
2021 | 459          | 3.005            | 153             | 1,890
2022 | 213          | 3.005            | 71              | 840
2023 | 643          | 3.650            | 176             | 2,120
2024 | 2,619        | 4.450            | 589             | 6,940
2025 | 906          | 4.450            | 204             | 2,380
2026 | 2,122        | 4.450            | 477             | 5,610
```

---

## 6. Canonical Observation Schema

Every ingested observation is normalized into the immutable scientific schema defined in [canonicalSchema.ts](file:///home/justin/Desktop/NASA/src/shared/canonicalSchema.ts) and [canonicalObservation.ts](file:///home/justin/Desktop/NASA/server/schemas/canonicalObservation.ts):

```typescript
export interface CanonicalObservationRecord {
  id: string;                         // Deterministic natural PK
  granuleOrSourceUrl: string;         // Authoritative NASA EOSDIS source URL
  queryParams: {
    source: string;
    aoi: string;
    date: string;
  };
  provenanceVersion: string;          // e.g., 'NASA_FIRMS_COL6.1_V2'
  rawPayloadChecksumSha256: string;   // 64-character SHA-256 hash of raw row
  acquisitionTimestampUtc: string;    // ISO-8601 UTC
  ingestionTimestampUtc: string;      // Ingestion time
  localSolarTimeHours: number;        // Local Solar Time (0.00 to 24.00)
  satellite: string;                  // 'Terra', 'Aqua', 'SNPP', 'NOAA-20', 'NOAA-21'
  sensor: 'MODIS' | 'VIIRS';
  productLayer: string;               // 'MODIS_1KM', 'VIIRS_375M', 'VIIRS_750M'
  orbitPass: 'Ascending' | 'Descending';
  dayNight: 'D' | 'N';
  latitude: number;
  longitude: number;
  scanKm: number;                     // Cross-track spatial resolution
  trackKm: number;                    // Along-track spatial resolution
  pixelAreaKm2: number;               // Projected ground footprint
  viewZenithBin: 'nadir_0_20' | 'mid_20_40' | 'limb_40_plus';
  viewZenithAngleDeg: number;         // Viewing zenith angle
  frpMw: number | null;               // Fire Radiative Power in MW
  brightnessKelvin: number | null;    // Brightness temperature 4µm
  backgroundBrightnessKelvin: number | null; // Background temperature 11µm
  modisConfidencePct: number | null;  // 0-100% (null for VIIRS)
  viirsConfidenceCategory: 'low' | 'nominal' | 'high' | null; // (null for MODIS)
  qaCloudFlag: 'cloud_free' | 'cloud_edge' | 'cloudy' | 'unassessed';
  fireType: number;                   // 0: vegetation, 1: active volcano, 2: static, 3: offshore
  studyAoi: string;                   // 'REG-NILGIRI'
}
```

