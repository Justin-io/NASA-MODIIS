# Environmental Physics, Rothermel Fire Spread & Orbital Mechanics

## 1. Rothermel (1972) Mathematical Wildfire Spread Engine

The wildfire propagation engine in [rothermelSpreadEngine.ts](file:///home/justin/Desktop/NASA/src/shared/rothermelSpreadEngine.ts) is an exact implementation of the USDA Forest Service mathematical surface fire spread model (Rothermel 1972; Albini 1976).

### 1.1 The Forward Rate of Spread Differential Equation
$$R = \frac{I_R \cdot \xi \cdot (1 + \Phi_W + \Phi_S)}{\rho_b \cdot \epsilon \cdot Q_{ig}} \quad [\text{m/min}]$$

```
+---------------------------------------------------------------------------------+
|                                 NUMERATOR (HEAT SOURCE)                         |
|  I_R: Reaction Intensity (total heat release per unit area per unit time)       |
|  \xi: Propagating Flux Ratio (fraction of heat received by adjacent fuels)      |
|  (1 + \Phi_W + \Phi_S): Dimensionless wind (\Phi_W) and slope (\Phi_S) factors  |
+---------------------------------------------------------------------------------+
                                         |
                                         v  DIVIDED BY
+---------------------------------------------------------------------------------+
|                               DENOMINATOR (HEAT SINK)                           |
|  \rho_b: Fuel bed bulk density (ovendry fuel mass per unit bed volume)          |
|  \epsilon: Effective heating number (fraction of fuel heated to ignition)       |
|  Q_{ig}: Heat of preignition (heat required to bring unit fuel mass to flame)   |
+---------------------------------------------------------------------------------+
```

### 1.2 Mathematical Derivations of Engine Components

#### 1. Fuel Bed Bulk Density ($\rho_b$) and Packing Ratios ($\beta, \beta_{op}$)
- **Bulk Density**:
  $$\rho_b = \frac{w_0}{\delta} \quad [\text{kg/m}^3]$$
  where $w_0$ is ovendry fuel loading ($\text{kg/m}^2$) and $\delta$ is fuel bed depth ($\text{m}$).
- **Packing Ratio ($\beta$)**:
  $$\beta = \frac{\rho_b}{\rho_p}$$
  where $\rho_p = 512.6\text{ kg/m}^3$ ($32\text{ lb/ft}^3$) is ovendry fuel particle density.
- **Optimum Packing Ratio ($\beta_{op}$)**:
  $$\beta_{op} = 3.348 \cdot \sigma_{\text{imperial}}^{-0.8189}$$
  where $\sigma_{\text{imperial}} = \sigma_{\text{metric}} / 3.28084$ is the surface-area-to-volume ratio in $\text{ft}^{-1}$.

#### 2. Reaction Intensity ($I_R$)
$$I_R = \Gamma' \cdot w_n \cdot h \cdot \eta_M \cdot \eta_s \quad [\text{kJ}/(\text{m}^2\cdot\text{min})]$$
- **Optimum Reaction Velocity ($\Gamma'$)**:
  $$\Gamma' = \Gamma'_{\max} \cdot \left(\frac{\beta}{\beta_{op}}\right)^A \cdot \exp\left[A \cdot \left(1 - \frac{\beta}{\beta_{op}}\right)\right]$$
  $$\Gamma'_{\max} = \frac{\sigma_{\text{imperial}}^{1.5}}{495 + 0.0594 \cdot \sigma_{\text{imperial}}^{1.5}}, \quad A = \frac{1}{4.77 \cdot \sigma_{\text{imperial}}^{0.1} - 7.27}$$
- **Net Fuel Loading ($w_n$)**:
  $$w_n = w_0 \cdot (1 - S_t) \quad (\text{where total mineral content } S_t = 0.0555)$$
- **Heat of Combustion ($h$)**: $18,600\text{ kJ/kg}$ (standard low heat of combustion).
- **Moisture Damping ($\eta_M$)**:
  $$r_M = \min\left(1.0, \frac{M_f}{M_x}\right)$$
  $$\eta_M = 1 - 2.59 r_M + 5.11 r_M^2 - 3.52 r_M^3 \quad (\eta_M = 0 \text{ when } M_f \ge M_x)$$
- **Mineral Damping ($\eta_s$)**:
  $$\eta_s = \min(1.0, 0.174 \cdot S_e^{-0.19}) = 0.417 \quad (\text{effective silica-free mineral fraction } S_e = 0.010)$$

#### 3. Propagating Flux Ratio ($\xi$)
$$\xi = \frac{\exp\left[\left(0.792 + 0.681 \cdot \sigma_{\text{imperial}}^{0.5}\right) \cdot (\beta + 0.1)\right]}{192 + 0.2595 \cdot \sigma_{\text{imperial}}}$$

#### 4. Topographic Slope Factor ($\Phi_S$)
Terrain slope is a major driver of fire spread in mountain ecosystems such as the Nilgiris (Western Ghats):
$$\Phi_S = 5.275 \cdot \beta^{-0.3} \cdot (\tan \phi)^2$$
where $\phi$ is the ground slope angle in radians.
*Note: On a $30^\circ$ incline ($\tan 30^\circ \approx 0.577$), $\Phi_S \approx 9.2$, accelerating forward rate of spread by over $10\times$ relative to flat ground.*

#### 5. Wind Factor ($\Phi_W$)
$$\Phi_W = C \cdot (3.281 \cdot U_{\text{mid}})^B \cdot \left(\frac{\beta}{\beta_{op}}\right)^{-E}$$
where $U_{\text{mid}}$ is midflame wind speed in $\text{m/s}$, and:
$$C = 7.47 \cdot \exp(-0.133 \cdot \sigma_{\text{imperial}}^{0.55}), \quad B = 0.02526 \cdot \sigma_{\text{imperial}}^{0.54}, \quad E = 0.715 \cdot \exp(-0.000359 \cdot \sigma_{\text{imperial}})$$

#### 6. Heat of Preignition ($Q_{ig}$) & Effective Heating Number ($\epsilon$)
$$Q_{ig} = 250 + 1116 \cdot M_f \cdot 2.326 \quad [\text{kJ/kg}]$$
$$\epsilon = \exp\left(-\frac{138}{\sigma_{\text{imperial}}}\right)$$

#### 7. Byram Fireline Intensity ($I_B$) and Flame Length ($F_L$)
- **Fireline Intensity (Byram 1959)**:
  $$I_B = H \cdot w_a \cdot \frac{R}{60} \quad [\text{kW/m}]$$
- **Flame Length (Byram 1959)**:
  $$F_L = 0.0775 \cdot I_B^{0.46} \quad [\text{m}]$$

---

## 2. Anderson 13 Standard Fire Behavior Fuel Models

ALEX parameterizes the six dominant wildland fuel models in [rothermelSpreadEngine.ts](file:///home/justin/Desktop/NASA/src/shared/rothermelSpreadEngine.ts):

| Model Code | Fuel Model Name | Fuel Load $w_0$ ($\text{kg/m}^2$) | Fuel Depth $\delta$ ($\text{m}$) | Extinction Moisture $M_x$ | SAV Ratio $\sigma$ ($\text{m}^{-1}$) | Typical Biome / Ecosystem |
|---|---|---|---|---|---|---|
| **1** | Short Grass (1 ft) | 0.166 | 0.305 | 0.12 (12%) | 5,740 | Arid savanna / plateau |
| **2** | Timber Grass & Understory | 0.448 | 0.305 | 0.15 (15%) | 5,200 | Open pine / savanna woodland |
| **4** | Chaparral / High Shrub | 1.123 | 1.829 | 0.20 (20%) | 4,500 | Dense montane shrub / brush |
| **8** | Closed Timber Litter (Light) | 0.336 | 0.061 | 0.30 (30%) | 6,100 | Dense hardwood / evergreen |
| **9** | Hardwood / Pine Litter | 0.655 | 0.061 | 0.25 (25%) | 5,600 | Deciduous dry forest floor |
| **10** | Timber with Heavy Understory | 0.675 | 0.305 | 0.25 (25%) | 5,400 | Nilgiris Shola-grassland ecotone |

---

## 3. Atmospheric Thermodynamics & Fuel Moisture

Implemented in [weatherAdapter.ts](file:///home/justin/Desktop/NASA/server/adapters/weatherAdapter.ts) and [liveFuelsAdapter.ts](file:///home/justin/Desktop/NASA/server/adapters/liveFuelsAdapter.ts).

### 3.1 Equilibrium Moisture Content (EMC) via Nelson (2000) & Byram
Fine dead fuels (leaves, needles, cured grass) rapidly exchange moisture with the ambient atmosphere:
$$\text{EMC}(T, H) = \begin{cases} 
0.03229 + 0.281073 H - 0.000578 H T, & H < 10\% \\ 
2.22749 + 0.160107 H - 0.014784 T, & 10\% \le H \le 50\% \\ 
21.0606 + 0.005565 H^2 - 0.00035 H T - 0.483199 H, & H > 50\% 
\end{cases}$$
where $T$ is temperature in $^\circ\text{C}$ and $H$ is relative humidity in $\%$.

**Derived Fuel Dryness Index**:
$$\text{FuelDrynessPct} = \text{round}\left(\max\left(0, \min\left(100, \left(1 - \frac{\text{EMC}}{30}\right) \times 100\right)\right)\right)$$

### 3.2 Tetens Saturation Vapor Pressure & Vapor Pressure Deficit (VPD)
- **Saturation Vapor Pressure ($e_s$)**:
  $$e_s(T) = 0.61078 \cdot \exp\left(\frac{17.27 \cdot T}{T + 237.3}\right) \quad [\text{kPa}]$$
- **Vapor Pressure Deficit (VPD)**:
  $$\text{VPD} = e_s(T) \cdot \left(1 - \frac{H}{100}\right) \quad [\text{kPa}]$$
High VPD ($> 2.5\text{ kPa}$) rapidly desorbs moisture from live foliage and fine dead fuels, creating extreme crown-fire transition potential.

---

## 4. SGP4 Satellite Orbital Mechanics & CelesTrak TLE Integration

Implemented in [orbitalService.ts](file:///home/justin/Desktop/NASA/server/services/orbitalService.ts) and [orbitalMath.ts](file:///home/justin/Desktop/NASA/src/shared/orbitalMath.ts).

### 4.1 SGP4 (Simplified General Perturbations 4) Theory
SGP4 models the motion of near-Earth orbiting objects ($T < 225\text{ minutes}$) under the gravitational perturbations of Earth's oblateness ($J_2, J_3, J_4$), atmospheric drag, and solar/lunar gravitational third-body effects.

### 4.2 J2 Oblateness & Nodal Precession
Sun-synchronous orbits maintain a constant Local Solar Time (LST) crossing by matching the nodal precession rate to Earth's mean orbital motion around the Sun ($360^\circ / 365.25\text{ days} \approx 0.9856^\circ / \text{day}$):
$$\dot{\Omega} = -\frac{3}{2} J_2 \left(\frac{R_E}{p}\right)^2 n \cos i \quad [\text{rad/s}]$$
where:
- $J_2 = 1.08263 \times 10^{-3}$ (second zonal harmonic geopotential coefficient).
- $R_E = 6,378.137\text{ km}$ (Earth equatorial radius).
- $p = a(1 - e^2)$ (semi-latus rectum).
- $n = \sqrt{\mu / a^3}$ (mean motion).
- $i$: inclination ($98.2^\circ$ for Terra, $98.7^\circ$ for VIIRS).

### 4.3 Authentic CelesTrak NORAD Two-Line Elements
The system runs live SGP4 state propagation on authentic NORAD TLE elements:
```
TERRA (CATNR: 25994)
1 25994U 99068A   26317.92845958  .00000323  00000+0  74469-4 0  9991
2 25994  97.9265   1.3927 0003544 108.9156 353.6658 14.61196780431475

AQUA (CATNR: 27424)
1 27424U 02022A   26317.91074306  .00000799  00000+0  16835-3 0  9994
2 27424  98.4492 290.3525 0001149 107.8217 278.6300 14.62279014305150

NOAA-20 / JPSS-1 (CATNR: 43013)
1 43013U 17073A   26317.92457274  .00000075  00000+0  56363-4 0  9996
2 43013  98.7926 256.1370 0001164 130.8784 229.2493 14.19536900465713

NOAA-21 / JPSS-2 (CATNR: 54234)
1 54234U 22150A   26317.88453332  .00000065  00000+0  51446-4 0  9997
2 54234  98.7206 254.2287 0002651 111.2994 248.8466 14.19558773207785
```

---

## 5. WebGPU / TSL Solar Day/Night Terminator Shading

Implemented in [intelligenceEngine.ts](file:///home/justin/Desktop/NASA/src/shared/intelligenceEngine.ts) for 3D Globe visualization:
$$\cos z = \sin \phi \sin \delta_\odot + \cos \phi \cos \delta_\odot \cos(\text{HA})$$
where:
- $\delta_\odot = -23.44^\circ \cos\left(\frac{360^\circ}{365} (d + 10)\right)$ is solar declination.
- $\text{HA} = (\text{UTC} - 12\text{ h}) \times 15^\circ/\text{h} + \text{lng}$ is the solar hour angle.
- Day occurs when $z \le 90^\circ$.
- Civil twilight occurs when $90^\circ < z \le 96^\circ$.
- Night occurs when $z > 108^\circ$.

