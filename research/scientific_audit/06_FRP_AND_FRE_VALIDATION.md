# FIRELENS SCIENTIFIC AUDIT — 06: FRP & FIRE RADIATIVE ENERGY (FRE) VALIDATION
**NASA Space Apps Challenge 2026: Harmonization of MODIS and VIIRS Hot Spots**
**Audit Date**: November 14, 2026  
**Auditor**: Thermal Remote Sensing & Physical Modeling Lead  
**Status**: Critical Physical Model Audit  

---

## 1. Dimensional & Physical Foundations

- **Fire Radiative Power (FRP)**:
  Instantaneous rate of radiant energy emitted by flaming and smoldering biomass:
  $$\text{FRP}(t) = \left(\frac{A_{\text{sample}} \sigma}{\alpha}\right) \left(T_{4\mu\text{m}}^4 - T_{\text{bg}, 4\mu\text{m}}^4\right) \quad [\text{MW} = 10^6\text{ J/s}]$$
  FRP is an **instantaneous power snapshot** captured during the $\sim 10\text{-second}$ sweep of an orbital pass.

- **Fire Radiative Energy (FRE)**:
  Total cumulative thermal energy released over a fire's lifespan:
  $$\text{FRE} = \int_{t_{\text{start}}}^{t_{\text{extinct}}} \text{FRP}(t) \, dt \quad [\text{MJ, MWh, or GWh}]$$

---

## 2. Red-Team Audit of Current Implementation

### 2.1 The Defect in `fireReconciliationEngine.ts`
In [src/shared/fireReconciliationEngine.ts](file:///home/justin/Desktop/NASA/src/shared/fireReconciliationEngine.ts#L355-L357):
```ts
const avgFrp = frpCount > 0 ? totalFrpSum / frpCount : 10;
// Estimated thermal energy: Mean FRP (MW) * duration (hours) * 1e-3 => GWh
const estGWh = Number((avgFrp * Math.max(1, durationHours) * 0.001).toFixed(3));
```

### 2.2 Physical Impossibility of this Formulation
1. **Unphysical Constant Power Assumption**:
   - Consider a multi-day fire detected by Terra on Day 1 at 10:30 UTC ($\text{FRP} = 25\text{ MW}$) and detected again by Aqua on Day 3 at 08:30 UTC ($\text{FRP} = 15\text{ MW}$).
   - The code calculates:
     $$\Delta \tau = 46.0\text{ hours}, \quad \overline{\text{FRP}} = 20.0\text{ MW}$$
     $$\text{Estimated Energy} = 20.0\text{ MW} \times 46.0\text{ h} \times 10^{-3} = \mathbf{0.920\text{ GWh}}$$
   - This assumes the fire burned continuously at $20\text{ MW}$ for all 46 hours!
   - In wildland fire ecology, fires in the Western Ghats undergo pronounced diurnal extinguishing: active flaming drops near zero between 22:00 and 09:00 LST due to nighttime relative humidity recovery and cool temperatures.
   - Polar orbiters provide only 2 to 4 snapshots per 24 hours. The code has **zero data** during the 20+ hours between passes!
2. **Double Violation of NASA Guidelines**:
   - It violates the explicit rule: **Never average FRP across distinct passes**.
   - It fabricates continuous energy where only sparse snapshots exist.

---

## 3. Audit Verdict & Required Corrections

| Metric / Method | Implementation Status | Scientific Validity | Audit Verdict |
|:---|:---:|:---:|:---|
| **Instantaneous Peak FRP ($\text{FRP}_{\text{peak}}$)** | Implemented in Tier 1, 2, 3 | Physical measurement at overpass moment | **VERIFIED & ACCEPTED** |
| **Instantaneous Single-Pass Energy ($\text{MW} \cdot \Delta t_{\text{pass}}$)** | Implemented in Tier 1 | Valid for observed overpass sweep | **VERIFIED & ACCEPTED** |
| **Multi-Day Continuous Energy ($\text{GWh}$)** | Implemented via `avgFrp * duration` | Unphysical constant-power extrapolation | **REJECTED (Must be disabled or marked unobserved)** |

### Required Source Code Correction:
1. In `Tier3PhysicalFireEvent`:
   - Keep `peakFrpMw` and `peakFrpTimestampUtc`.
   - Remove the unsupported continuous GWh claim. Replace with `observedInstantaneousEnergyMJ` (sum of instantaneous observed snapshot radiant energies).
   - Add explicit field:
     `samplingDisclaimer: "Sparse snapshot sampling (2-4 passes/day) does not permit continuous FRE integration without unverified diurnal interpolation models."`
2. In [FireLensResearchView.tsx](file:///home/justin/Desktop/NASA/src/fire/FireLensResearchView.tsx):
   - Remove "Estimated Thermal Energy (GWh)" from Tier 3 event cluster displays. Display instantaneous peak FRP and duration instead.

