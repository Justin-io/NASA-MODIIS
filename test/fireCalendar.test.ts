import test from 'node:test';
import assert from 'node:assert/strict';
import { fireCalendarService } from '../server/services/fireCalendarService';
import { FIXTURE_FIRE_OBSERVATIONS } from './fixtures/fireCalendarFixture';

test('FireCalendarService - returns multi-year burning activity with medians and anomalies', () => {
  // Test 1: Empty state when unpopulated (Rule P0.1, DATA-01)
  const emptyCalendar = fireCalendarService.getRegionalBurningCalendar('REG-NILGIRI');
  assert.equal(emptyCalendar.dataAvailability, 'UNAVAILABLE');
  assert.equal(emptyCalendar.monthlyRecords.length, 0);

  // Test 2: Multi-year aggregation with verified test fixture data
  const calendar = fireCalendarService.getRegionalBurningCalendar('REG-NILGIRI', FIXTURE_FIRE_OBSERVATIONS);
  assert.equal(calendar.regionId, 'REG-NILGIRI');
  assert.ok(calendar.monthlyRecords.length > 20);
  assert.ok(calendar.annualSummaries.length >= 3);
  assert.equal(calendar.historicalMediansByMonth.length, 12);

  const marchRecord2024 = calendar.monthlyRecords.find((r) => r.year === 2024 && r.month === 3);
  assert.ok(marchRecord2024);
  assert.equal(marchRecord2024?.monthLabel, 'Mar');
  assert.ok(marchRecord2024?.harmonizedHotspots >= marchRecord2024?.modisHotspots);
  assert.ok(marchRecord2024?.observationCoveragePct > 80);
});

test('FireCalendarService - generates valid downloadable CSV format with scientific headers', () => {
  const csv = fireCalendarService.generateCalendarCsv('REG-NILGIRI', FIXTURE_FIRE_OBSERVATIONS);
  assert.ok(csv.startsWith('# ALEX'));
  assert.ok(csv.includes('Year,Month,Month_Name,MODIS_Hotspots,VIIRS_375m_Hotspots'));
  assert.ok(csv.includes('2024,3,Mar'));
});

test('FireCalendarService - generates valid GeoJSON FeatureCollection', () => {
  const geojsonStr = fireCalendarService.generateCalendarGeoJson('REG-NILGIRI', 11.4185, 76.7042, FIXTURE_FIRE_OBSERVATIONS);
  const parsed = JSON.parse(geojsonStr);
  assert.equal(parsed.type, 'FeatureCollection');
  assert.ok(parsed.features.length > 20);
  assert.equal(parsed.features[0].geometry.type, 'Point');
  assert.ok(parsed.features[0].properties.harmonizedHotspots > 0);
});
