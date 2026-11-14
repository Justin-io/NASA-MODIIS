import test from 'node:test';
import assert from 'node:assert/strict';
import { NasaFirmsAdapter } from '../server/adapters/nasaFirms';
import { WeatherAdapter } from '../server/adapters/weatherAdapter';

test('NasaFirmsAdapter - honest unconfigured notice when mapKey is absent', async () => {
  const adapter = new NasaFirmsAdapter('');
  const status = adapter.getStatus();
  assert.equal(status.configured, false);
  assert.match(status.message, /Awaiting NASA_FIRMS_MAP_KEY/);

  const res = await adapter.fetchObservations();
  assert.equal(res.isLive, false);
  assert.match(res.providerNotice, /NASA_FIRMS_MAP_KEY not supplied/);
});

test('WeatherAdapter - degToCompass conversion produces accurate cardinal directions', () => {
  const adapter = new WeatherAdapter();
  // Private method accessed via any for unit testing
  const toCompass = (adapter as any).degToCompass.bind(adapter);
  assert.equal(toCompass(0), 'N');
  assert.equal(toCompass(90), 'E');
  assert.equal(toCompass(180), 'S');
  assert.equal(toCompass(270), 'W');
  assert.equal(toCompass(65), 'ENE');
});
