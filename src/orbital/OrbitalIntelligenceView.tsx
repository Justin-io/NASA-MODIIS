import React, { useEffect, useState } from 'react';
import {
  ObservationOpportunity,
  SatelliteMissionId,
  SatelliteOrbitRecord,
  ViewingGeometry,
} from '../shared/types';
import {
  computeViewingGeometryMath,
  evaluateTerraDriftImpactMath,
  REGISTERED_SATELLITES,
} from '../shared/orbitalMath';
import { apiClient } from '../shared/apiClient';
import { Card, SectionHeader } from '../shared/ui';
import {
  Activity,
  AlertTriangle,
  Clock,
  Compass,
  Eye,
  Globe2,
  Info,
  Maximize2,
  Orbit,
  Radio,
  Satellite,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';

export const OrbitalIntelligenceView: React.FC<{
  selectedRegionId?: string;
}> = ({ selectedRegionId = 'REG-NILGIRI' }) => {
  const [satellites, setSatellites] = useState<SatelliteOrbitRecord[]>([]);
  const [selectedSatId, setSelectedSatId] = useState<SatelliteMissionId>('TERRA');
  const [scanAngleDeg, setScanAngleDeg] = useState<number>(30);
  const [driftYear, setDriftYear] = useState<number>(2026);
  const [opportunities, setOpportunities] = useState<ObservationOpportunity[]>([]);

  useEffect(() => {
    setSatellites(REGISTERED_SATELLITES);
    apiClient
      .getObservationOpportunities(selectedRegionId)
      .then((opps) => setOpportunities(opps))
      .catch(() => {});
  }, [selectedRegionId]);

  const activeSat = satellites.find((s) => s.id === selectedSatId) || satellites[0];
  const geometry: ViewingGeometry = computeViewingGeometryMath(
    selectedSatId,
    scanAngleDeg
  );
  const terraDrift = evaluateTerraDriftImpactMath(driftYear);

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="ALEX ORBITAL SUBSYSTEM — ORBIT DYNAMICS & GEOMETRY"
        title="Orbital Dynamics, Viewing Geometry & Multi-Year Drift Impact"
        subtitle="Mission-specific ephemeris, nodal precession, scan-angle pixel distortion, and quantitative diurnal fire cycle sampling bias analysis."
        action={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-mono font-medium border border-emerald-200">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            12 SATELLITE CONSTELLATIONS MONITORED
          </div>
        }
      />

      {/* Satellite Platform Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {satellites.map((sat) => {
          const isSelected = sat.id === selectedSatId;
          return (
            <button
              key={sat.id}
              onClick={() => setSelectedSatId(sat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border flex items-center gap-2 ${
                isSelected
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Satellite className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
              <span>{sat.name}</span>
              {sat.operationalStatus === 'orbital_drift_mode' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-mono">
                  DRIFT
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Top Grid: Spacecraft Telemetry & Ephemeris */}
      {activeSat && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-slate-200 bg-white">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <Orbit className="w-4 h-4 text-sky-600" />
              Orbital Altitude & Orbit
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {activeSat.altitudeKm} <span className="text-sm font-normal text-slate-500">km</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 capitalize font-medium">
              {activeSat.orbitType.replace('_', ' ')} • Inc: {activeSat.inclinationDeg}°
            </div>
          </Card>

          <Card className="p-4 border-slate-200 bg-white">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Equator Crossing (MLST)
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 truncate">
              {activeSat.meanLocalEquatorCrossingTime.split(' ')[0]}
            </div>
            <div className="text-xs text-slate-500 mt-1 truncate">
              {activeSat.meanLocalEquatorCrossingTime}
            </div>
          </Card>

          <Card className="p-4 border-slate-200 bg-white">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <Compass className="w-4 h-4 text-indigo-600" />
              Period & Repeat Cycle
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {activeSat.periodMinutes} <span className="text-sm font-normal text-slate-500">min</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Repeat Cycle: {activeSat.repeatCycleDays} days • NORAD: {activeSat.noradId}
            </div>
          </Card>

          <Card className="p-4 border-slate-200 bg-white">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Mission Status & Payload
            </div>
            <div className="text-sm font-bold text-slate-900 uppercase">
              {activeSat.operationalStatus.replace(/_/g, ' ')}
            </div>
            <div className="text-xs text-slate-500 mt-1 truncate" title={activeSat.primaryInstruments}>
              {activeSat.sensorPayload.join(', ')}
            </div>
          </Card>
        </div>
      )}

      {/* Main Analysis Section: Terra Orbital Drift Impact Laboratory */}
      <Card className="p-6 border-slate-200 bg-white shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 tracking-wider uppercase">
              <AlertTriangle className="w-4 h-4" />
              NASA Terra Orbital Drift Impact Laboratory
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
              Diurnal Fire Cycle Sampling Bias vs. Environmental Change
            </h3>
            <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
              Terra's equator crossing drifted from 10:30 AM to ~09:05 AM between 2000 and 2026. Because diurnal fire radiative power accelerates toward midday, earlier observations record lower thermal intensity independently of on-ground conditions.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            {[2000, 2018, 2020, 2022, 2024, 2026].map((yr) => (
              <button
                key={yr}
                onClick={() => setDriftYear(yr)}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition-all ${
                  driftYear === yr
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/70">
          <div>
            <div className="text-xs text-slate-500 font-medium">Equator Crossing Time (MLST)</div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {terraDrift.crossingTimeFormatted}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-mono">
              Altitude: {terraDrift.altitudeKm} km
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 font-medium">Equator Crossing Drift</div>
            <div className="text-xl font-bold font-mono text-amber-600 mt-1">
              {terraDrift.crossingTimeFormatted}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Shifted by ~{terraDrift.driftMinutes} min from 10:30 baseline
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 font-medium">Harmonization Guidance</div>
            <div className="text-xs text-slate-700 font-medium mt-1 leading-relaxed">
              Anchor longitudinal statistics against Aqua (13:30) & NOAA-20 (12:40) to prevent false trend conclusions.
            </div>
          </div>
        </div>

        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Scientific Assessment: </span>
            {terraDrift.scientificAssessment}
          </div>
        </div>
      </Card>

      {/* Middle Section: Viewing Geometry & Pixel Distortion Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="text-xs font-bold text-sky-600 tracking-wider uppercase flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                Viewing Geometry & Pixel Footprint
              </div>
              <h4 className="text-base font-bold text-slate-900 mt-0.5">
                Scan Angle Distortion & Bowtie Expansion
              </h4>
            </div>
            <div className="text-xs font-mono text-slate-500">
              Sensor: <span className="font-semibold text-slate-900">{selectedSatId}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-slate-600">
              <span>Scan Angle (Nadir 0° to Edge 55°):</span>
              <span className="font-mono font-bold text-slate-900">{scanAngleDeg}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="55"
              step="1"
              value={scanAngleDeg}
              onChange={(e) => setScanAngleDeg(parseInt(e.target.value, 10))}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[11px] text-slate-500">View Zenith</div>
              <div className="text-base font-bold font-mono text-slate-900 mt-1">
                {geometry.viewZenithAngleDeg}°
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[11px] text-slate-500">Expansion Ratio</div>
              <div className="text-base font-bold font-mono text-sky-600 mt-1">
                {geometry.bowtieExpansionRatio}x
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[11px] text-slate-500">Pixel Footprint</div>
              <div className="text-base font-bold font-mono text-slate-900 mt-1">
                {geometry.pixelFootprintKm2} <span className="text-xs font-normal">km²</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[11px] text-slate-500">Swath Width</div>
              <div className="text-base font-bold font-mono text-slate-900 mt-1">
                {geometry.swathWidthKm} <span className="text-xs font-normal">km</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {selectedSatId.includes('VIIRS') || selectedSatId.includes('NOAA')
              ? 'VIIRS applies onboard 3:1 aggregation along scan, restricting edge pixel growth to ~2.1x nadir area (375m -> 750m).'
              : 'MODIS does not aggregate across scan, resulting in significant "bowtie" pixel growth from 1.0 km² at nadir to ~4.8 km² at swath edges.'}
          </p>
        </Card>

        {/* Observation Opportunities & Overpass Schedule */}
        <Card className="p-6 border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="text-xs font-bold text-indigo-600 tracking-wider uppercase flex items-center gap-1.5">
                <Globe2 className="w-4 h-4" />
                Overpass Opportunities Calendar
              </div>
              <h4 className="text-base font-bold text-slate-900 mt-0.5">
                Upcoming Satellite Observation Windows ({selectedRegionId})
              </h4>
            </div>
            <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              PREDICTED
            </span>
          </div>

          <div className="space-y-2.5">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">{opp.satelliteName}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                    Pass: {new Date(opp.scheduledPassUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC • Elevation: {opp.maxElevationDeg}° • View Zenith: {opp.viewZenithDeg}°
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                      opp.qualityStatus === 'OPTIMAL'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {opp.qualityStatus}
                  </span>
                  <span className="text-xs font-mono text-slate-600">
                    {opp.clearSkyProbabilityPct}% Clear
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 italic">
            Pass predictions derived from Keplerian propagation of current two-line orbital element sets (NORAD Space-Track OMM).
          </p>
        </Card>
      </div>
    </div>
  );
};
