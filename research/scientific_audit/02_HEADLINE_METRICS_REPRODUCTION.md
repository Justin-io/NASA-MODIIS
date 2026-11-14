# FIRELENS SCIENTIFIC AUDIT — 02: HEADLINE METRICS REPRODUCTION
**NASA Space Apps Challenge 2026: Harmonization of MODIS and VIIRS Hot Spots**
**Audit Date**: November 14, 2026  
**Auditor**: Independent Scientific Red-Team  
**Status**: Certified Independent Reproduction  

---

## 1. Headline Metrics Comparison Table

| Metric | Reported Value | Independently Reproduced Value | Discrepancy | Audit Finding & Verdict |
|:---|:---:|:---:|:---:|:---|
| **Raw Baseline Fire Season Mean** | 1,532 / yr | **1,532.3 / yr** (4,597 total / 3 yrs) | 0.3 (Rounding) | **VERIFIED** |
| **Raw Modern Fire Season Mean** | 1,979 / yr | **1,979.25 / yr** (7,917 total / 4 yrs) | 0.25 (Rounding) | **VERIFIED** |
| **Apparent Growth Rate** | +29.2% | **+29.17%** $\rightarrow$ **+29.2%** | 0.0% | **VERIFIED** |
| **Adjusted Baseline Mean** | 507 / yr | **507.33 / yr** (1,522 total / 3 yrs) | 0.33 (Rounding) | **VERIFIED** |
| **Adjusted Modern Mean** | 545 / yr | **544.75 / yr** (2,179 total / 4 yrs) | 0.25 (Rounding) | **VERIFIED** |
| **Adjusted Physical Growth Rate** | +7.4% | **+7.38%** $\rightarrow$ **+7.4%** | 0.0% | **VERIFIED** |
| **Observing System Attribution** | 91.6% | **91.63%** $\rightarrow$ **91.6%** | 0.0% | **VERIFIED (as Model Contribution)** |
| **Bootstrap 95% CI (Lower)** | 73.3% | **73.2% – 73.3%** | 0.1% | **VERIFIED** |
| **Bootstrap 95% CI (Upper)** | 100.0% | **100.0%** | 0.0% | **VERIFIED** |
| **MCD64A1 Raw Concordance R²** | 0.420 | **0.225** (Annual) / **0.266** (Monthly) | **-0.195** | **DISPROVED / REJECTED** (Fallback default was promoted) |
| **MCD64A1 Adjusted Concordance R²** | 0.860 | **0.120** (Annual) / **0.202** (Monthly) | **-0.740** | **DISPROVED / REJECTED** (Fallback default was promoted) |

---

## 2. Complete Yearly Summary Breakdown (Empirical vs Adjusted)

Calculated from [data/firelens_nilgiris_2019_2026.json](file:///home/justin/Desktop/NASA/data/firelens_nilgiris_2019_2026.json) across all 13,065 records:

| Year | Period Category | Raw Hotspots | MODIS | VIIRS | VIIRS Fraction | Effort Index $E(y)$ | Adjusted Hotspots | Mean FRP (MW) | Total FRP (MW) |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **2019** | Baseline | 3,529 | 312 | 3,217 | 91.2% | **3.006** | 1,174 | 21.66 | 76,425.2 |
| **2020** | Baseline | 609 | 33 | 576 | 94.6% | **3.081** | 198 | 7.59 | 4,620.4 |
| **2021** | Baseline | 459 | 30 | 429 | 93.5% | **3.056** | 150 | 8.22 | 3,773.2 |
| **2022** | Transition | 551 | 25 | 526 | 95.5% | **3.100** | 178 | 7.26 | 4,000.1 |
| **2023** | Modern | 2,270 | 123 | 2,147 | 94.6% | **3.851** | 589 | 9.06 | 20,571.3 |
| **2024** | Modern | 2,619 | 124 | 2,495 | 95.3% | **3.560** | 736 | 12.45 | 32,613.2 |
| **2025** | Modern | 906 | 40 | 866 | 95.6% | **3.568** | 254 | 8.30 | 7,515.5 |
| **2026** | Modern | 2,122 | 118 | 2,004 | 94.4% | **3.539** | 600 | 12.25 | 25,997.2 |

---

## 3. Detailed Inspection of Attribution Discrepancies

### 3.1 Mathematical Derivation of Attribution
$$\Delta_{\text{raw}} = 1979.25 - 1532.33 = 446.92\text{ hotspots/season}$$
$$\Delta_{\text{adj}} = 544.75 - 507.33 = 37.42\text{ hotspots/season}$$
$$\Delta_{\text{effort}} = 446.92 - 37.42 = 409.50\text{ hotspots/season}$$
$$F_{\text{effort}} = \frac{409.50}{446.92} \times 100\% = 91.6277\% \rightarrow \mathbf{91.6\%}$$

### 3.2 Audit Assessment: Is it "Causal"?
**Finding**: The equation subtracts an effort-normalized delta from an un-normalized delta.
- This is a **statistical counterfactual model decomposition**, not an experimental causal proof (since satellites cannot be randomized over Earth).
- **Mandate**: In scientific reporting, this must be termed:
  `"Estimated observation-system contribution to apparent detection growth"`
  rather than unconditional "causal attribution".

---

## 4. Leave-One-Year-Out (LOYO) Sensitivity Analysis

Because the baseline has only $N_b=3$ years and the modern period has $N_c=4$ years, sensitivity to individual extreme fire years was audited:

| Excluded Year | Excluded Period | Resulting Baseline Mean | Resulting Modern Mean | Apparent Growth | Resulting Attribution | Sensitivity Impact |
|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **None (Full Sample)** | — | 1,532.3 | 1,979.3 | +29.2% | **91.6%** | Baseline reference |
| **Exclude 2019** | Baseline | 534.0 | 1,979.3 | **+270.7%** | **74.3%** | 2019 was an extreme drought year (IOD+); excluding it triples apparent growth |
| **Exclude 2020** | Baseline | 1,994.0 | 1,979.3 | **-0.7%** | **100.0%** | Modern period shows no growth relative to 2019/2021 |
| **Exclude 2021** | Baseline | 2,069.0 | 1,979.3 | **-4.3%** | **100.0%** | Modern period shows negative growth relative to 2019/2020 |
| **Exclude 2023** | Modern | 1,532.3 | 1,882.3 | +22.8% | **91.0%** | Stable attribution |
| **Exclude 2024** | Modern | 1,532.3 | 1,766.0 | +15.2% | **92.9%** | Stable attribution |
| **Exclude 2025** | Modern | 1,532.3 | 2,337.0 | +52.5% | **89.5%** | 2025 was wet; excluding it increases modern growth |
| **Exclude 2026** | Modern | 1,532.3 | 1,931.7 | +26.1% | **92.2%** | Stable attribution |

**Critical Audit Conclusion**:
The baseline cohort is heavily influenced by the 2019 positive Indian Ocean Dipole (IOD) extreme fire season (3,529 detections). If 2019 is excluded, baseline average drops from 1,532 to 534, and apparent growth surges to $+270.7\%$, but observing effort still explains $74.3\%$ of that increase. The finding that observing capacity explains $\ge 74\%$ of apparent growth is robust across all leave-one-out permutations.

---

## 5. Rejection of the R² = 0.860 Claim

**Audit Discovery**:
The previous report claimed:
- Raw Hotspots vs MCD64A1: $R^2 = 0.420$
- Adjusted Hotspots vs MCD64A1: $R^2 = 0.860$

**Empirical Reality**:
When computed against the actual 24 monthly periods and 8 annual periods:
- Annual Raw Hotspots vs MCD64A1: **$R^2 = 0.225$**
- Annual Adjusted Hotspots vs MCD64A1: **$R^2 = 0.120$**
- Monthly Raw Hotspots vs MCD64A1: **$R^2 = 0.266$**
- Monthly Adjusted Hotspots vs MCD64A1: **$R^2 = 0.202$**

The values $0.420$ and $0.860$ were legacy fallback constants in `observationDecomposition.ts` (lines 320–321) that were mistakenly promoted as empirical results. The actual empirical correlation is modest ($R^2 \approx 0.12–0.27$). This claim is **REJECTED** and must be corrected across all documentation and UI components.
