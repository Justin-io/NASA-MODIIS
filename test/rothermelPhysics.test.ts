import test from 'node:test';
import assert from 'node:assert/strict';
import { RothermelSpreadEngine, ANDERSON_FUEL_MODELS } from '../src/shared/rothermelSpreadEngine';

test('RothermelSpreadEngine - verifies Anderson fuel models and differential spread physics', () => {
  // Test 1: Model 10 (Timber with Understory) zero wind, flat ground
  const flatCalm = RothermelSpreadEngine.calculateSpread({
    fuelModelCode: 10,
    fuelMoistureFraction: 0.10,
    midflameWindSpeedKmh: 0,
    slopeDegrees: 0,
  });

  assert.ok(flatCalm.rateOfSpreadMMin > 0, 'Zero-wind rate of spread must be positive');
  assert.equal(flatCalm.windFactor, 0, 'Zero wind must produce Phi_W = 0');
  assert.equal(flatCalm.slopeFactor, 0, 'Zero slope must produce Phi_S = 0');
  assert.ok(flatCalm.flameLengthM > 0, 'Flame length must be positive');
  assert.ok(flatCalm.reactionIntensityKjM2Min > 0, 'Reaction intensity must be positive');

  // Test 2: Topographic slope acceleration (Nilgiris mountain ridge: 30° slope)
  const steepSlope = RothermelSpreadEngine.calculateSpread({
    fuelModelCode: 10,
    fuelMoistureFraction: 0.10,
    midflameWindSpeedKmh: 0,
    slopeDegrees: 30,
  });

  assert.ok(steepSlope.slopeFactor > 5.0, '30° slope must yield high slope factor Phi_S');
  assert.ok(steepSlope.rateOfSpreadMMin > flatCalm.rateOfSpreadMMin * 3, 'Uphill slope must accelerate spread rate > 3x');

  // Test 3: Wind factor acceleration
  const windy = RothermelSpreadEngine.calculateSpread({
    fuelModelCode: 10,
    fuelMoistureFraction: 0.10,
    midflameWindSpeedKmh: 35,
    slopeDegrees: 0,
  });

  assert.ok(windy.windFactor > 1.0, '35 km/h wind must produce significant wind factor');
  assert.ok(windy.rateOfSpreadKmh > flatCalm.rateOfSpreadKmh * 2, 'Wind must accelerate forward spread');

  // Test 4: Fuel moisture damping at extinction threshold (M_x = 0.25 for Model 10)
  const moistFuel = RothermelSpreadEngine.calculateSpread({
    fuelModelCode: 10,
    fuelMoistureFraction: 0.28, // Above extinction moisture
    midflameWindSpeedKmh: 10,
    slopeDegrees: 5,
  });

  assert.equal(moistFuel.moistureDamping, 0, 'Moisture damping must reach 0 when M_f >= M_x');
  assert.ok(moistFuel.rateOfSpreadMMin <= 0.05, 'Spread must be severely suppressed at extinction moisture');
});

