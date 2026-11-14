# ALEX Independent Scientific Validation Protocol

**Platform Version**: 2.7.0  
**Domain**: Multi-Sensor Thermal Anomaly Harmonisation & Spatial-Temporal Validation  
**Compliance Standard**: CEOS-WGCV (Committee on Earth Observation Satellites — Working Group on Calibration and Validation)

---

## 1. Validation Architecture & Separation of Concerns

ALEX strictly separates algorithmic hypothesis generation from independent ground-truth validation:
1. **Raw Observations**: Pure satellite data preserving source calibration, pixel scan geometry, and native confidence.
2. **Harmonised Hypotheses**: Spatially and temporally associated detection clusters labeled strictly as hypotheses, not confirmed fires.
3. **Independent Benchmarks**: High-resolution optical/radar imagery, verified incident databases, and official perimeter datasets.

```
+-------------------------------------------------------------+
|                NASA Active-Fire Ingestion                   |
|     MODIS (Terra/Aqua) + VIIRS (SNPP/NOAA-20/NOAA-21)       |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|            Footprint-Aware Association Engine               |
|      Oriented Ellipse Intersection: D_12 <= a_1 + a_2       |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|              Harmonised Thermal Event Hypothesis            |
|      (Native FRP distributions preserved per sensor)        |
+------------------------------+------------------------------+
                               |
         +---------------------+---------------------+
         | Validation Gating                         |
         v                                           v
+-------------------------------+   +-------------------------------+
|  Independent Ground Truth     |   |   High-Resolution Imagery     |
|  - Official NIFC/FSI/EFFIS    |   |   - Sentinel-2 MSI (20m)      |
|  - Radio Logs & Dispatch CAD  |   |   - Landsat-8/9 OLI (30m)     |
|  - Field Ranger Patrols       |   |   - Sentinel-1 SAR (10m)      |
+---------------+---------------+   +---------------+---------------+
                |                                   |
                +-----------------+-----------------+
                                  |
                                  v
+-------------------------------------------------------------+
|           Statistical Verification & Error Analysis         |
|  - Association Precision / Recall (False Merges / Splits)   |
|  - Cross-Sensor FRP Discrepancy & Bowtie Expansion Residuals|
|  - Model Promotion Gate (Human Commander Sign-Off Required) |
+-------------------------------------------------------------+
```

---

## 2. Distinction Between Measurement Regimes

ALEX enforces strict ontologies between fundamentally distinct remote sensing products:
- **Active-Fire Hotspots (MOD14 / VNP14IMG)**: Instantaneous thermal radiation emitted by flaming and smoldering combustion during satellite overflight (temporal snapshot: ~seconds).
- **Burned Area Products (MCD64A1 / FireCCI)**: Cumulative surface reflectance change (normalized burn ratio NBR) mapping post-fire vegetation destruction across monthly composites.
- **Burn Scars (High-Resolution MSI/OLI)**: Optical surface reflectance depressions. **Scientific Rule**: A Sentinel-2 burn scar detected on day $t+3$ provides geometric evidence of fire occurrence but CANNOT be used as proof of the exact temporal hour of a thermal anomaly on day $t$.
- **Confirmed Fire Perimeters**: Official GIS polygons delivered by incident management authorities.

---

## 3. Quantitative Evaluation Metrics

### 3.1 Spatial Association Accuracy
Given an independent high-resolution active thermal reference set $R = \{r_1, \dots, r_M\}$ and harmonised hypotheses $H = \{h_1, \dots, h_K\}$:

- **Association Precision ($P$)**:
  $$P = \frac{|H_{\text{matched}}|}{|H|}$$
  Proportion of candidate harmonised hypotheses corresponding to verified ground combustion.

- **Association Recall ($R$)**:
  $$R = \frac{|R_{\text{detected}}|}{|R|}$$
  Proportion of real thermal events captured by satellite overpasses.

- **False Merge Rate**: Frequency at which distinct, physically separated wildfires ($> 1\text{ km}$ separation verified by Landsat/Sentinel-2) are incorrectly merged into a single harmonised cell due to excessive scan-edge footprint expansion.

- **False Split Rate**: Frequency at which a single continuous flaming front is fragmented into disconnected cells.

### 3.2 Pairwise Cross-Sensor Radiometric Evaluation
For contemporaneous, spatially overlapping overflights (e.g. NOAA-20 and Suomi-NPP within 50 min, or Terra morning passes intersecting Aqua afternoon footprints):
$$\text{Residual}_{\text{FRP}} = \text{FRP}_{\text{VIIRS}} - \text{FRP}_{\text{MODIS}}$$
Mean Absolute Percentage Error (MAPE) and standard deviation of residuals are reported with 95% confidence intervals across scan angle bins.

---

## 4. Model Promotion Governance (Human-in-the-Loop)

To prevent automated drift and unverified parameter modifications in production:
1. **Candidate Challenger Submission**: A proposed parameter set (e.g. revised spatial association threshold, scan angle weighting) is submitted to `POST /api/learning/evaluate`.
2. **Empirical Evaluation**: The system evaluates candidate parameters against isolated benchmark datasets. In purified production without ground truth, evaluation returns `EVALUATION_BLOCKED` rather than fabricating scores.
3. **Sign-off Enforcement**: Even when a challenger demonstrates superior performance, ALEX returns `NEEDS_HUMAN_SIGN_OFF`.
4. **Promotion Authorization**: Promotion to active champion requires a cryptographically signed request from an authorized `incident_commander` or `system_administrator` to `POST /api/learning/promote`, recorded in the SHA-256 audit ledger.
