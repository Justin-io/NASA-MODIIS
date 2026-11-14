# FIRELENS SCIENTIFIC AUDIT — 01: INDEPENDENT REPRODUCTION PROTOCOL
**NASA Space Apps Challenge 2026: Harmonization of MODIS and VIIRS Hot Spots**
**Author**: Principal Scientific Auditor & Reliability Lead  
**Execution Environment**: Python 3.13.5 (Stand-alone, independent of TypeScript/Node engine)  
**Status**: Authoritative Protocol Specification  

---

## 1. Objective & Scope

This protocol establishes the exact, deterministic procedure for independently replicating every headline statistic, observation count, effort normalization, causal attribution estimate, and validation metric in the FireLens platform without depending on frontend code or pre-rendered figures.

---

## 2. Input Datasets & Integrity Checksums

All analytical procedures consume strictly frozen empirical datasets located in the repository `data/` directory:

| Dataset File | Role in Audit | Record Count | File Size (Bytes) | SHA-256 Cryptographic Checksum |
|:---|:---|:---:|:---:|:---|
| [data/firelens_nilgiris_2019_2026.json](file:///home/justin/Desktop/NASA/data/firelens_nilgiris_2019_2026.json) | Primary canonical active fire archive | 13,065 | 15,560,359 | `3ba37d331db77d9fa54f0f1845921baa30169c8c76ceaff5579a5b67403f3046` |
| [data/firelens_nilgiris_2019_2026.csv](file:///home/justin/Desktop/NASA/data/firelens_nilgiris_2019_2026.csv) | Primary CSV distribution | 13,066 lines | 2,987,705 | `e415a770514138e92f254e0c4e7da3c09f3e4933a907573d84a77bc40b12ca51` |
| [data/nilgiris_empirical_monthly.json](file:///home/justin/Desktop/NASA/data/nilgiris_empirical_monthly.json) | Aggregated monthly empirical counts | 24 | 18,245 | `2bb69a83d735071dfb689df94faeb09c48b4886616089304bb7291aef1729cc5` |
| [data/firelens_validation_mcd64a1.json](file:///home/justin/Desktop/NASA/data/firelens_validation_mcd64a1.json) | NASA MCD64A1 Burned Area monthly series | 24 | 14,812 | `829a8a7353b3dfa3bf879eb94c3c3eef512df8b108e4389cb43f1e9447e44a49` |

---

## 3. Geographic Boundary & Temporal Window Specifications

- **Spatial Bounding Box (WGS84)**:
  - $\lambda_{\min} = 76.2000^\circ\text{E}, \quad \lambda_{\max} = 77.3000^\circ\text{E}$
  - $\phi_{\min} = 11.0000^\circ\text{N}, \quad \phi_{\max} = 12.0000^\circ\text{N}$
  - Target Area: Nilgiris Biosphere Reserve, Mudumalai Tiger Reserve, Bandipur National Park, Silent Valley National Park, and Bhavani River Basin.
- **Temporal Window**:
  - Longitudinal span: 2019-01-01 through 2026-04-30.
  - **Seasonal Window Finding**: Every year in the archive strictly covers **February 15 through April 25** (the peak dry fire season in the Western Ghats). Detections outside this ~70-day window are zero or suppressed by southwest monsoon cloud cover.
- **Cohort Grouping**:
  - **Baseline Cohort ($N_b = 3$ years)**: 2019, 2020, 2021.
  - **Transition Year**: 2022 (launch of JPSS-2 / NOAA-21 in late 2022; excluded from baseline and modern cohorts).
  - **Modern Constellation Cohort ($N_c = 4$ years)**: 2023, 2024, 2025, 2026.

---

## 4. Mathematical Equations

### 4.1 Raw and Adjusted Annual Fire Season Means
$$\bar{N}_{\text{baseline}} = \frac{1}{3} \sum_{y=2019}^{2021} N_y, \quad \bar{N}_{\text{modern}} = \frac{1}{4} \sum_{y=2023}^{2026} N_y$$
$$\Delta_{\text{raw}} = \bar{N}_{\text{modern}} - \bar{N}_{\text{baseline}}$$
$$\text{Growth}_{\text{raw}} = \left(\frac{\Delta_{\text{raw}}}{\bar{N}_{\text{baseline}}}\right) \times 100\%$$

$$\bar{N}_{\text{adj, baseline}} = \frac{1}{3} \sum_{y=2019}^{2021} \frac{N_y}{E(y)}, \quad \bar{N}_{\text{adj, modern}} = \frac{1}{4} \sum_{y=2023}^{2026} \frac{N_y}{E(y)}$$
$$\Delta_{\text{adj}} = \bar{N}_{\text{adj, modern}} - \bar{N}_{\text{adj, baseline}}$$
$$\text{Growth}_{\text{adj}} = \left(\frac{\Delta_{\text{adj}}}{\bar{N}_{\text{adj, baseline}}}\right) \times 100\%$$

### 4.2 Estimated Observation Contribution (Attribution)
$$F_{\text{effort}} = \left(\frac{\Delta_{\text{raw}} - \Delta_{\text{adj}}}{\Delta_{\text{raw}}}\right) \times 100\%$$

### 4.3 Monte Carlo Cohort Bootstrap Resampling
For $b = 1, \dots, B$ ($B = 1,000$ iterations with seed `42`):
1. Sample 3 years with replacement from $\{ (N_y, E_y) \mid y \in [2019, 2021] \}$.
2. Sample 4 years with replacement from $\{ (N_y, E_y) \mid y \in [2023, 2026] \}$.
3. Calculate resampled baseline means $\bar{N}_b^{*b}, \bar{N}_{\text{adj}, b}^{*b}$ and modern means $\bar{N}_c^{*b}, \bar{N}_{\text{adj}, c}^{*b}$.
4. Compute resampled estimator $\hat{\theta}^{*b} = \frac{\Delta_{\text{raw}}^{*b} - \max(0, \Delta_{\text{adj}}^{*b})}{\Delta_{\text{raw}}^{*b}} \times 100\%$.
5. Determine 2.5th and 97.5th percentiles: $[\hat{\theta}_{0.025}^*, \hat{\theta}_{0.975}^*]$.

---

## 5. Execution Commands

To execute the reproduction protocol independently:

```bash
# 1. Verify dataset integrity checksums
python3 -c "import hashlib; print(hashlib.sha256(open('data/firelens_nilgiris_2019_2026.json', 'rb').read()).hexdigest())"

# 2. Run independent reproduction script
python3 research/scientific_audit/reproduce_headline_metrics.py

# 3. Run deep sensitivity analysis
python3 research/scientific_audit/audit_deep_analysis.py
```

