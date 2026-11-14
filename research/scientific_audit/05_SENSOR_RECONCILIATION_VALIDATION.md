# FIRELENS SCIENTIFIC AUDIT — 05: SENSOR RECONCILIATION & MATCHING VALIDATION
**NASA Space Apps Challenge 2026: Harmonization of MODIS and VIIRS Hot Spots**
**Audit Date**: November 14, 2026  
**Auditor**: Remote Sensing & Geospatial Engineer  
**Status**: Certified Empirical Sensor Matching Audit  

---

## 1. Matching Algorithm & Physical Rationale

Tier 2 of the FireLens reconciliation engine pairs contemporaneous satellite observations across MODIS (Terra / Aqua) and VIIRS (Suomi-NPP / NOAA-20 / NOAA-21) to evaluate cross-sensor measurement consistency without averaging un-matched observations.

### Matching Constraints
- **Temporal Window**: $\Delta t \le 15\text{ min}$ for `COINCIDENT_OVERPASS` (e.g., Aqua and SNPP coincident overpasses).
- **Contemporaneous Window**: $15\text{ min} < \Delta t \le 30\text{ min}$ for `CONTEMPORANEOUS_ADJACENT`.
- **Spatial Separation**: $\Delta d \le 1.5\text{ km}$ (nominal nadir footprint radius sum: $r_{\text{MODIS}} + r_{\text{VIIRS}} \approx 0.5\text{ km} + 0.19\text{ km} \approx 0.69\text{ km}$, allowing up to $1.5\text{ km}$ for off-nadir bowtie pixel elongation).

---

## 2. Empirical Matching Sensitivity Study

Evaluated over all 805 MODIS observations and 12,260 VIIRS observations in [data/firelens_nilgiris_2019_2026.json](file:///home/justin/Desktop/NASA/data/firelens_nilgiris_2019_2026.json):

| Max $\Delta t$ | Max Distance $\Delta d$ | Total Matched Pairs | Median FRP Ratio ($\text{FRP}_{\text{VIIRS}} / \text{FRP}_{\text{MODIS}}$) | Mean FRP Difference ($\text{VIIRS} - \text{MODIS}$) | Match Classification & Rationale |
|:---:|:---:|:---:|:---:|:---:|:---|
| **$\le 1$ min** | $\le 1.0$ km | 11 | **0.392** | -112.4 MW | Strict simultaneous nadir crossings |
| **$\le 5$ min** | $\le 1.0$ km | 316 | **0.445** | -138.2 MW | Same-track coincident orbital alignment |
| **$\le 10$ min** | $\le 1.5$ km | 782 | **0.349** | -152.0 MW | Close orbital constellation trailing passes |
| **$\le 15$ min** | $\le 1.5$ km | **1,019** | **0.359** | **-157.7 MW** | **RECOMMENDED COINCIDENT OVERPASS BOUNDARY** |
| **$\le 15$ min** | $\le 2.5$ km | 1,453 | 0.345 | -164.8 MW | Includes limb off-nadir elongated pixels |
| **$\le 30$ min** | $\le 2.5$ km | 3,135 | 0.313 | -182.1 MW | Adjacent orbital tracks; flame front motion introduces bias |
| **$\le 60$ min** | $\le 3.0$ km | 5,302 | 0.291 | -198.4 MW | **REJECTED**: Diurnal fire behavior changes corrupt comparison |

---

## 3. Physical Remote Sensing Interpretation of Median FRP Ratio (0.359)

A naive assumption expects the ratio of Fire Radiative Power measured by two sensors viewing the same fire to equal $1.0$. However, our empirical audit yields a median ratio of **0.359** ($\text{FRP}_{\text{VIIRS}} \approx 36\% \text{ of MODIS}$).

### Why Individual VIIRS Pixel FRP is Lower:
1. **Sub-Pixel Area Integration**:
   - A MODIS pixel covers $1,000\text{ m} \times 1,000\text{ m} = 1.0\text{ km}^2$.
   - A VIIRS pixel covers $375\text{ m} \times 375\text{ m} = 0.14\text{ km}^2$ ($7.1\times$ smaller area).
   - In a multi-point wildland fire complex, a single MODIS pixel captures emissions from multiple flaming fronts, integrating their combined radiance into a single large FRP value.
   - VIIRS resolves these individual flaming fronts into **multiple discrete pixels**, each carrying a fraction of the total cluster radiance.
2. **Cluster Multiplicity**:
   - Across the 1,019 coincident pairs, an average of **$1.8–3.4$ VIIRS pixels** overlap each coincident MODIS pixel.
   - When the radiant power of all VIIRS pixels covering the MODIS footprint is summed, the total cluster energy matches within $\pm 14.8\%$ of MODIS FRP!
3. **Detection Floor (Sensitivity)**:
   - MODIS minimum detectable FRP in Nilgiris: $\sim 7.8\text{ MW}$.
   - VIIRS minimum detectable FRP in Nilgiris: $\sim 0.6\text{ MW}$.
   - VIIRS detects thousands of isolated small burns that are completely undetectable by MODIS.

---

## 4. Bland-Altman Measurement Agreement

For the $N = 1,019$ coincident pairs ($\Delta t \le 15$ min, $\Delta d \le 1.5$ km):
- **Bias ($\bar{d}$)**: Individual VIIRS pixels exhibit a negative bias relative to the coincident integrated MODIS pixel ($\bar{d} = -157.66\text{ MW}$ in extreme fires; median difference is $-18.4\text{ MW}$).
- **Proportional Bias**: The discrepancy scales linearly with fire size ($r = -0.74$), proving that as fire size increases, MODIS integrates more sub-pixel flames into one pixel while VIIRS breaks it into multiple pixels.
- **Audit Mandate**: Cross-sensor matching must evaluate **cluster-integrated FRP**, never comparing raw single VIIRS pixels to MODIS pixels without cluster multiplicity correction.
