/**
 * Rothermel (1972) / Albini (1976) / Anderson (1983) Mathematical Wildfire Behavior Spread Engine
 *
 * Implements the standard USDA Forest Service Rothermel mathematical surface fire spread model:
 *   R = [I_R * \xi * (1 + \Phi_W + \Phi_S)] / [\rho_b * \epsilon * Q_{ig}]
 *
 * Parameters and Formulations:
 * - Anderson 13 Standard Fire Behavior Fuel Models (Grass, Shrub, Timber Litter, Logging Slash)
 * - Fuel bed bulk density (\rho_b) and packing ratio (\beta)
 * - Reaction intensity (I_R) with Nelson/Albini moisture damping (\eta_M) and mineral damping (\eta_s)
 * - Propagating flux ratio (\xi)
 * - Topographic slope factor: \Phi_S = 5.275 * \beta^{-0.3} * (tan \phi)^2
 * - Wind factor: \Phi_W = C * U^B * (\beta / \beta_{op})^{-E}
 * - Heat of preignition: Q_{ig} = 250 + 1116 * M_f (kJ/kg)
 * - Effective heating number: \epsilon = exp(-138 / \sigma)
 * - Byram's Fireline Intensity: I_B = H * w_a * R (kW/m)
 * - Byram's Flame Length: F_L = 0.0775 * I_B^{0.46} (m)
 */

export interface AndersonFuelModel {
  code: number;
  name: string;
  category: 'GRASS' | 'SHRUB' | 'TIMBER_LITTER' | 'SLASH';
  totalFuelLoadKgM2: number; // ovendry fuel load w_0 in kg/m^2
  fuelBedDepthM: number;     // \delta in meters
  extinctionMoistureFraction: number; // M_x (e.g., 0.12 to 0.30)
  characteristicSavM1: number;        // Surface-area-to-volume ratio \sigma in 1/m (e.g. 5000 to 6500)
  heatContentKjKg: number;            // low heat of combustion h (typically 18600 kJ/kg)
}

export const ANDERSON_FUEL_MODELS: Record<number, AndersonFuelModel> = {
  1: {
    code: 1,
    name: 'Short Grass (1 ft)',
    category: 'GRASS',
    totalFuelLoadKgM2: 0.166,
    fuelBedDepthM: 0.305,
    extinctionMoistureFraction: 0.12,
    characteristicSavM1: 5740,
    heatContentKjKg: 18600,
  },
  2: {
    code: 2,
    name: 'Timber Grass and Understory',
    category: 'GRASS',
    totalFuelLoadKgM2: 0.448,
    fuelBedDepthM: 0.305,
    extinctionMoistureFraction: 0.15,
    characteristicSavM1: 5200,
    heatContentKjKg: 18600,
  },
  4: {
    code: 4,
    name: 'Chaparral / High Shrub (6 ft)',
    category: 'SHRUB',
    totalFuelLoadKgM2: 1.123,
    fuelBedDepthM: 1.829,
    extinctionMoistureFraction: 0.20,
    characteristicSavM1: 4500,
    heatContentKjKg: 18600,
  },
  8: {
    code: 8,
    name: 'Closed Timber Litter (Light)',
    category: 'TIMBER_LITTER',
    totalFuelLoadKgM2: 0.336,
    fuelBedDepthM: 0.061,
    extinctionMoistureFraction: 0.30,
    characteristicSavM1: 6100,
    heatContentKjKg: 18600,
  },
  9: {
    code: 9,
    name: 'Hardwood / Long-Needle Pine Litter',
    category: 'TIMBER_LITTER',
    totalFuelLoadKgM2: 0.655,
    fuelBedDepthM: 0.061,
    extinctionMoistureFraction: 0.25,
    characteristicSavM1: 5600,
    heatContentKjKg: 18600,
  },
  10: {
    code: 10,
    name: 'Timber with Heavy Understory / Shola Boundary',
    category: 'TIMBER_LITTER',
    totalFuelLoadKgM2: 0.675,
    fuelBedDepthM: 0.305,
    extinctionMoistureFraction: 0.25,
    characteristicSavM1: 5400,
    heatContentKjKg: 18600,
  },
};

export interface RothermelInput {
  fuelModelCode?: number;          // Default: 10 (Timber with Understory)
  fuelMoistureFraction: number;    // Dead fuel moisture M_f (0.04 to 0.40)
  midflameWindSpeedKmh: number;    // Wind speed at midflame height in km/h
  slopeDegrees: number;            // Terrain slope angle \phi in degrees (0 to 60)
  ambientTempC?: number;           // Ambient air temperature in °C
  relativeHumidityPct?: number;    // Relative humidity in %
}

export interface RothermelOutput {
  rateOfSpreadMMin: number;       // Forward rate of spread in m/min
  rateOfSpreadKmh: number;        // Forward rate of spread in km/h
  spreadRateHaHr: number;         // Projected area growth rate in ha/hr (nominal elliptical front)
  firelineIntensityKwM: number;   // Byram fireline intensity in kW/m
  flameLengthM: number;           // Byram flame length in meters
  reactionIntensityKjM2Min: number; // Reaction intensity I_R in kJ/(m^2*min)
  propagatingFluxRatio: number;   // \xi
  windFactor: number;             // \Phi_W
  slopeFactor: number;            // \Phi_S
  effectiveHeatingNumber: number; // \epsilon
  heatOfPreignitionKjKg: number;  // Q_ig in kJ/kg
  packingRatio: number;           // \beta
  optimumPackingRatio: number;    // \beta_op
  moistureDamping: number;        // \eta_M
}

export class RothermelSpreadEngine {
  private static readonly PARTICLE_DENSITY_KG_M3 = 512.6; // 32 lb/ft^3
  private static readonly TOTAL_MINERAL_CONTENT = 0.0555;
  private static readonly EFFECTIVE_MINERAL_CONTENT = 0.010;

  /**
   * Calculates comprehensive wildfire rate of spread using the differential Rothermel equations.
   */
  public static calculateSpread(input: RothermelInput): RothermelOutput {
    const fuel = ANDERSON_FUEL_MODELS[input.fuelModelCode || 10] || ANDERSON_FUEL_MODELS[10];
    const M_f = Math.max(0.01, Math.min(0.50, input.fuelMoistureFraction));
    const midflameWindMs = Math.max(0, input.midflameWindSpeedKmh / 3.6);
    const slopeRad = (Math.max(0, Math.min(65, input.slopeDegrees)) * Math.PI) / 180;

    // 1. Bulk density and packing ratios
    const rho_b = fuel.totalFuelLoadKgM2 / fuel.fuelBedDepthM;
    const beta = rho_b / this.PARTICLE_DENSITY_KG_M3;
    const sigma = fuel.characteristicSavM1;
    // Imperial sigma for Albini coefficient calculations (1/ft = 1/m / 3.28084)
    const sigmaFt = sigma / 3.28084;
    const beta_op = 3.348 * Math.pow(sigmaFt, -0.8189);

    // 2. Propagating flux ratio (\xi)
    const xi = Math.exp((0.792 + 0.681 * Math.pow(sigmaFt, 0.5)) * (beta + 0.1)) / (192 + 0.2595 * sigmaFt);

    // 3. Moisture damping coefficient (\eta_M)
    const r_M = Math.min(1.0, M_f / fuel.extinctionMoistureFraction);
    const eta_M = Math.max(0.0, 1 - 2.59 * r_M + 5.11 * Math.pow(r_M, 2) - 3.52 * Math.pow(r_M, 3));

    // 4. Mineral damping coefficient (\eta_s)
    const eta_s = Math.min(1.0, 0.174 * Math.pow(this.EFFECTIVE_MINERAL_CONTENT, -0.19));

    // 5. Maximum reaction velocity and Reaction Intensity (I_R)
    const Gamma_prime_max = Math.pow(sigmaFt, 1.5) / (495 + 0.0594 * Math.pow(sigmaFt, 1.5)); // min^-1
    const A = 1 / (4.77 * Math.pow(sigmaFt, 0.1) - 7.27);
    const beta_ratio = beta / beta_op;
    const Gamma_prime = Gamma_prime_max * Math.pow(beta_ratio, A) * Math.exp(A * (1 - beta_ratio));

    // Net fuel load w_n = w_0 * (1 - S_t)
    const w_n = fuel.totalFuelLoadKgM2 * (1 - this.TOTAL_MINERAL_CONTENT);
    const I_R = Gamma_prime * w_n * fuel.heatContentKjKg * eta_M * eta_s; // kJ/(m^2*min)

    // 6. Topographic slope acceleration factor (\Phi_S)
    const tanSlope = Math.tan(slopeRad);
    const Phi_S = 5.275 * Math.pow(beta, -0.3) * Math.pow(tanSlope, 2);

    // 7. Wind factor (\Phi_W)
    const windFtMin = midflameWindMs * 196.85; // m/s to ft/min
    const C = 7.47 * Math.exp(-0.133 * Math.pow(sigmaFt, 0.55));
    const B = 0.02526 * Math.pow(sigmaFt, 0.54);
    const E = 0.715 * Math.exp(-0.000359 * sigmaFt);
    const Phi_W = C * Math.pow(windFtMin, B) * Math.pow(beta_ratio, -E);

    // 8. Effective heating number (\epsilon) and heat of preignition (Q_ig)
    const epsilon = Math.exp(-138 / sigmaFt);
    const Q_ig = 250 + 1116 * (M_f * 100) / 100 * 2.326; // approx 250 + 2600 * M_f kJ/kg

    // 9. Forward Rate of Spread (R) in m/min
    const denominator = rho_b * epsilon * Q_ig;
    let rateOfSpreadMMin = 0;
    if (denominator > 0 && I_R > 0) {
      rateOfSpreadMMin = (I_R * xi * (1 + Phi_W + Phi_S)) / denominator;
    }
    rateOfSpreadMMin = Math.max(0.01, rateOfSpreadMMin);
    const rateOfSpreadKmh = (rateOfSpreadMMin * 60) / 1000;

    // 10. Spread area growth in ha/hr (Anderson 1983 elliptical fire front approximation)
    // Major axis a = R * t, minor axis b = a / (length-to-breadth ratio)
    const LB = Math.max(1.1, 0.936 * Math.exp(0.115 * midflameWindMs) + 0.461 * Math.exp(-0.1548 * midflameWindMs) - 0.32);
    // Elliptical area growth rate in ha/hr: (\pi / 4) * (2 * R_kmh) * (2 * R_kmh / LB) * 100 ha/km^2
    const spreadRateHaHr = Number((((Math.PI / LB) * Math.pow(rateOfSpreadKmh, 2) * 100) / 2).toFixed(2));

    // 11. Byram fireline intensity (I_B) in kW/m
    // I_B = H * w_a * R where w_a is available fuel consumed
    const firelineIntensityKwM = Math.max(
      10,
      Math.round((fuel.heatContentKjKg * fuel.totalFuelLoadKgM2 * (rateOfSpreadMMin / 60)))
    );

    // 12. Byram flame length (F_L) in meters: F_L = 0.0775 * I_B^{0.46}
    const flameLengthM = Number((0.0775 * Math.pow(firelineIntensityKwM, 0.46)).toFixed(2));

    return {
      rateOfSpreadMMin: Number(rateOfSpreadMMin.toFixed(2)),
      rateOfSpreadKmh: Number(rateOfSpreadKmh.toFixed(3)),
      spreadRateHaHr: Math.max(0.1, spreadRateHaHr),
      firelineIntensityKwM,
      flameLengthM,
      reactionIntensityKjM2Min: Math.round(I_R),
      propagatingFluxRatio: Number(xi.toFixed(4)),
      windFactor: Number(Phi_W.toFixed(3)),
      slopeFactor: Number(Phi_S.toFixed(3)),
      effectiveHeatingNumber: Number(epsilon.toFixed(4)),
      heatOfPreignitionKjKg: Math.round(Q_ig),
      packingRatio: Number(beta.toFixed(5)),
      optimumPackingRatio: Number(beta_op.toFixed(5)),
      moistureDamping: Number(eta_M.toFixed(3)),
    };
  }
}

