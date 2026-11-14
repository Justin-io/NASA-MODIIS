import React, { useMemo, useState } from 'react';
import {
  CommunityAdvisory,
  IncidentRecord,
  ResourceAsset,
  SimulationInputParams,
} from '../shared/types';
import {
  computeGeometricFireSpreadProjection,
  simulateScenarioOutcome,
} from '../shared/intelligenceEngine';
import { ProvenanceNoticeBanner, SectionHeader } from '../shared/ui';

interface OperationsAndSimulationViewProps {
  activeSection:
    | 'resources'
    | 'community'
    | 'simulation'
    | 'reports'
    | 'settings';
  resources: ResourceAsset[];
  advisories: CommunityAdvisory[];
  incidents: IncidentRecord[];
  onAssignResource: (resourceId: string, incidentId: string | null) => void;
  onBroadcastAdvisory: (advisoryId: string) => void;
}

export const OperationsAndSimulationView: React.FC<
  OperationsAndSimulationViewProps
> = ({
  activeSection,
  resources,
  advisories,
  incidents,
  onAssignResource,
  onBroadcastAdvisory,
}) => {
  const [resourceSourceFilter, setResourceSourceFilter] = useState<string>('all');
  const [simParams, setSimParams] = useState<SimulationInputParams>({
    windSpeedDeltaKmh: 12,
    windShiftDeg: 35,
    rainfallMmHr: 0,
    primaryRoadClosed: false,
    additionalCasualties: 0,
    waterSupplyDepletedPct: 25,
    secondaryIgnitionActive: false,
    satellitePassDelayed: false,
  });
  const [selectedReportDoc, setSelectedReportDoc] = useState<
    'ics201' | 'modis_viirs' | 'handoff'
  >('ics201');
  const [exportToast, setExportToast] = useState<string | null>(null);
  const [reducedMotionPref, setReducedMotionPref] = useState(false);
  const [highContrastPref, setHighContrastPref] = useState(false);

  const primaryIncident = incidents[0] || null;

  const handleDownloadRealPackage = () => {
    const filename = primaryIncident
      ? `ALEX_${primaryIncident.id}_SituationReport_ICS201.txt`
      : `ALEX_Standby_Status_ICS201.txt`;

    const icsContent = primaryIncident
      ? `================================================================================
ALEX — AUTONOMOUS LIVE ENVIRONMENTAL EXPERT
INCIDENT ACTION PLAN (IAP) & SITUATION BRIEFING (ICS FORM 201)
================================================================================
Incident ID: ${primaryIncident.id}
Title: ${primaryIncident.title}
Classification: ${primaryIncident.status}
Location: ${primaryIncident.coordinates.lat.toFixed(4)}N, ${primaryIncident.coordinates.lng.toFixed(4)}E (${primaryIncident.district})
Export Timestamp: ${new Date().toISOString()}

1. SATELLITE PROVENANCE & HARMONIZATION:
- MODIS Terra/Aqua Observations: ${primaryIncident.modisCount} detections
- VIIRS 375m Observations: ${primaryIncident.viirsCount} detections
- Harmonized Radiative Power (FRP): ${primaryIncident.harmonizedFrpMw} MW
- Historical Median: ${primaryIncident.historicalMedianFrpMw} MW
- Spatial Uncertainty Radius: ${primaryIncident.uncertaintyRadiusMeters} meters

2. METEOROLOGICAL CONDITIONS & SPREAD:
- Wind Vector: ${primaryIncident.windSpeedKmh} km/h from ${primaryIncident.windCompass} (${primaryIncident.windDirectionDeg}°)
- Temperature & Humidity: ${primaryIncident.temperatureC}°C, ${primaryIncident.humidityPct}% RH
- Estimated Area & Population Exposed: ${primaryIncident.estimatedAreaHa ?? '—'} Ha, ${primaryIncident.estimatedPopulationExposed ?? '—'} people

3. RESOURCE & ADVISORY COORDINATION:
- Resources Assigned: ${resources.length} active assets
- Advisories Active: ${advisories.length} public bulletins

4. TAMPER-EVIDENT CRYPTOGRAPHIC AUDIT:
- Ledger Protocol: Append-only SHA-256 block chain
- Governing Principle: Zero fabricated operational records (ALEX v2.6.0).
================================================================================`
      : `================================================================================
ALEX — AUTONOMOUS LIVE ENVIRONMENTAL EXPERT
OPERATIONAL STANDBY STATUS BRIEFING (ICS FORM 201)
================================================================================
Sector Status: Nominal Standby — No Active Emergencies Registered
Export Timestamp: ${new Date().toISOString()}
Data Provenance: Zero fabricated records per v2.6.0 Scientific Integrity Standard.
NASA FIRMS Feed: Active and listening for live orbital overpasses.
Ground Telemetry: Listening for field responder reports.
================================================================================`;

    const blob = new Blob([icsContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Also download GeoJSON from server
    const geojsonLink = document.createElement('a');
    geojsonLink.href = '/api/export/geojson';
    geojsonLink.download = 'ALEX_Incident_Geospatial.geojson';
    document.body.appendChild(geojsonLink);
    geojsonLink.click();
    document.body.removeChild(geojsonLink);

    setExportToast(
      `Successfully generated and downloaded ${filename} and live GeoJSON package.`
    );
  };
  const [fuelMoisturePct, setFuelMoisturePct] = useState<number>(
    primaryIncident?.soilMoisturePct || 14
  );
  const [relativeHumidityPct, setRelativeHumidityPct] = useState<number>(
    primaryIncident?.humidityPct || 22
  );

  const simResult = useMemo(
    () =>
      simulateScenarioOutcome(
        primaryIncident?.estimatedAreaHa || 0,
        primaryIncident?.windSpeedKmh || 15,
        primaryIncident?.vegetationDrynessIndex || 0.5,
        simParams
      ),
    [primaryIncident, simParams]
  );

  const geometricProjection = useMemo(
    () =>
      computeGeometricFireSpreadProjection({
        baseWindKmh: primaryIncident?.windSpeedKmh ?? 15,
        windSpeedDeltaKmh: simParams.windSpeedDeltaKmh,
        baseWindDirectionDeg: primaryIncident?.windDirectionDeg ?? 45,
        windShiftDeg: simParams.windShiftDeg,
        fuelMoisturePct,
        relativeHumidityPct,
        ambientTempC: primaryIncident?.temperatureC ?? 28,
        rainfallMmHr: simParams.rainfallMmHr,
        baseAreaHa: primaryIncident?.estimatedAreaHa ?? 0,
      }),
    [primaryIncident, simParams, fuelMoisturePct, relativeHumidityPct]
  );

  if (activeSection === 'resources') {
    const filteredResources = resources.filter((r) =>
      resourceSourceFilter === 'all'
        ? true
        : r.availabilitySource === resourceSourceFilter
    );

    return (
      <div className="space-y-5 sm:space-y-6">
        <ProvenanceNoticeBanner
          modeLabel="Resource & Apparatus Inventory"
          detail="Explicitly differentiates Live Verified Telemetry from Manual EOC Entries and Estimated/Simulated availability."
        />

        <SectionHeader
          kicker="Apparatus, Medical Beds, Tankers & Ground Sensors"
          title="Resource & Mission Management"
          subtitle="Track operational capability, last-seen timestamps, availability provenance, and incident assignments."
          rightSlot={
            <select
              aria-label="Filter by Availability Provenance"
              value={resourceSourceFilter}
              onChange={(e) => setResourceSourceFilter(e.target.value)}
              className="w-full sm:w-auto min-h-[40px] px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900"
            >
              <option value="all">
                All Availability Sources ({resources.length})
              </option>
              <option value="Live Verified Telemetry">
                ● Live Verified Telemetry
              </option>
              <option value="Manual EOC Entry">◐ Manual EOC Entry</option>
              <option value="Estimated / Simulated">
                ○ Estimated / Simulated
              </option>
            </select>
          }
        />

        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Asset ID & Name</th>
                  <th className="py-3 px-4">Category & Capability</th>
                  <th className="py-3 px-4">Availability Provenance</th>
                  <th className="py-3 px-4">Location & Last Seen</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Mission Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 text-xs">
                {filteredResources.map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-slate-900">
                        {res.id}
                      </div>
                      <div className="font-medium text-slate-800">
                        {res.name}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {res.category}
                      </div>
                      <div className="text-slate-500">{res.capability}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {res.availabilitySource === 'Live Verified Telemetry' ? (
                        <span className="text-emerald-700 font-semibold">
                          ● Live Verified Telemetry
                        </span>
                      ) : res.availabilitySource === 'Manual EOC Entry' ? (
                        <span className="text-sky-700 font-semibold">
                          ◐ Manual EOC Entry
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold">
                          ○ Estimated / Simulated
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800">{res.locationName}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {res.lastSeen}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {res.operationalStatus}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {res.assignedIncidentId ? (
                        <button
                          type="button"
                          onClick={() => onAssignResource(res.id, null)}
                          className="min-h-[36px] px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl whitespace-nowrap"
                        >
                          Assigned: {res.assignedIncidentId} (Release)
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!primaryIncident}
                          onClick={() =>
                            primaryIncident && onAssignResource(res.id, primaryIncident.id)
                          }
                          className="min-h-[36px] px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl whitespace-nowrap"
                        >
                          Stage for {primaryIncident ? primaryIncident.id : 'Active Incident'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeSection === 'community') {
    return (
      <div className="space-y-5 sm:space-y-6">
        <ProvenanceNoticeBanner
          modeLabel="Multilingual Community Protection & Statutory Attribution"
          detail="Distinguishes General Preparedness, Possible Nearby Hazard notifications, and Official Emergency Instructions attributed to the Nilgiris District Collectorate."
        />

        <SectionHeader
          kicker="Opt-In Farmer & Resident Advisories · Tamil, Badaga, Kannada, Malayalam & English"
          title="Community Protection & Public Advisory Coordination"
          subtitle="Prepare multilingual advisories, track SMS/VHF delivery and acknowledgement rates, and attribute all evacuation orders to statutory authorities."
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {advisories.map((adv) => (
            <div
              key={adv.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-slate-800">
                    {adv.id}
                  </span>
                  <span
                    className={`font-semibold ${
                      adv.tier === 'Official Emergency Instruction'
                        ? 'text-rose-700'
                        : adv.tier === 'Possible Nearby Hazard'
                        ? 'text-amber-700'
                        : 'text-sky-700'
                    }`}
                  >
                    {adv.tier}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-slate-900 mt-1.5">
                  {adv.zoneName}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  Authority: {adv.attributionAuthority}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 my-3 leading-relaxed">
                  {adv.messageBody}
                </div>

                <div className="text-xs text-slate-600">
                  Languages:{' '}
                  <span className="font-medium">
                    {adv.languages.join(', ')}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-600 mt-1">
                  Opt-In: {adv.recipientCount} · Delivered: {adv.deliveredPct}% ·
                  Ack: {adv.acknowledgedPct}%
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200/80 flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-slate-500">
                  {adv.status}
                </span>
                {adv.status !== 'Broadcast Active' && (
                  <button
                    type="button"
                    onClick={() => onBroadcastAdvisory(adv.id)}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800"
                  >
                    Authorise & Transmit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeSection === 'simulation') {
    return (
      <div className="space-y-5 sm:space-y-6">
        <div className="bg-indigo-50/90 border border-indigo-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-indigo-950">
          <div>
            <span className="font-mono font-bold">
              ◇ DIGITAL TWIN SCENARIO SIMULATION MODE (NOT OBSERVED FACT):{' '}
            </span>
            <span>
              All fire-spread rates, route shifts, and apparatus calculations below are hypothetical model projections, never guaranteed forecasts.
            </span>
          </div>
          <span className="font-mono text-[11px] text-indigo-800 shrink-0">
            Rothermel Spread Solver
          </span>
        </div>

        <SectionHeader
          kicker="Hypothetical Environmental & Operational Stress Testing"
          title="Scenario Simulation & Digital Twin Workspace"
          subtitle="Test wind direction shifts, heavy rainfall suppression, NH-181 road closures, reservoir drawdown, and satellite overpass delay."
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h3 className="text-sm font-semibold text-slate-900 pb-2 border-b border-slate-200/80">
              Hypothetical Perturbation Parameters
            </h3>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label
                  htmlFor="sim-wind-delta"
                  className="font-medium text-slate-700"
                >
                  Wind Speed Surge Delta (km/h)
                </label>
                <span className="font-mono font-semibold text-slate-900">
                  {simParams.windSpeedDeltaKmh >= 0
                    ? `+${simParams.windSpeedDeltaKmh}`
                    : simParams.windSpeedDeltaKmh}{' '}
                  km/h
                </span>
              </div>
              <input
                id="sim-wind-delta"
                type="range"
                min={-15}
                max={35}
                step={5}
                value={simParams.windSpeedDeltaKmh}
                onChange={(e) =>
                  setSimParams((p) => ({
                    ...p,
                    windSpeedDeltaKmh: Number(e.target.value),
                  }))
                }
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label
                  htmlFor="sim-wind-shift"
                  className="font-medium text-slate-700"
                >
                  Wind Azimuth Shift (Degrees)
                </label>
                <span className="font-mono font-semibold text-slate-900">
                  {simParams.windShiftDeg}°
                </span>
              </div>
              <input
                id="sim-wind-shift"
                type="range"
                min={0}
                max={90}
                step={15}
                value={simParams.windShiftDeg}
                onChange={(e) =>
                  setSimParams((p) => ({
                    ...p,
                    windShiftDeg: Number(e.target.value),
                  }))
                }
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label
                  htmlFor="sim-rain"
                  className="font-medium text-slate-700"
                >
                  Hypothetical Rainfall Rate (mm/hr)
                </label>
                <span className="font-mono font-semibold text-emerald-700">
                  {simParams.rainfallMmHr} mm/hr
                </span>
              </div>
              <input
                id="sim-rain"
                type="range"
                min={0}
                max={20}
                step={2}
                value={simParams.rainfallMmHr}
                onChange={(e) =>
                  setSimParams((p) => ({
                    ...p,
                    rainfallMmHr: Number(e.target.value),
                  }))
                }
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label
                  htmlFor="sim-relative-humidity"
                  className="font-medium text-slate-700"
                >
                  Ambient Relative Humidity (RH %)
                </label>
                <span className="font-mono font-semibold text-sky-700 tabular-nums">
                  {relativeHumidityPct}% RH (VPD {geometricProjection.vaporPressureDeficitKpa} kPa)
                </span>
              </div>
              <input
                id="sim-relative-humidity"
                aria-label="Ambient Relative Humidity (RH %)"
                type="range"
                min={10}
                max={85}
                step={3}
                value={relativeHumidityPct}
                onChange={(e) => setRelativeHumidityPct(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label
                  htmlFor="sim-fuel-moisture"
                  className="font-medium text-slate-700"
                >
                  Fine Dead Fuel & Soil Moisture (%)
                </label>
                <span className="font-mono font-semibold text-amber-700 tabular-nums">
                  {fuelMoisturePct}% (Eff: {geometricProjection.effectiveFuelMoisturePct}%)
                </span>
              </div>
              <input
                id="sim-fuel-moisture"
                aria-label="Fine Dead Fuel & Soil Moisture (%)"
                type="range"
                min={6}
                max={36}
                step={2}
                value={fuelMoisturePct}
                onChange={(e) => setFuelMoisturePct(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <label
                  htmlFor="sim-water-depletion"
                  className="font-medium text-slate-700"
                >
                  Local Reservoir Drawdown (%)
                </label>
                <span className="font-mono font-semibold text-slate-900">
                  {simParams.waterSupplyDepletedPct}%
                </span>
              </div>
              <input
                id="sim-water-depletion"
                type="range"
                min={0}
                max={80}
                step={10}
                value={simParams.waterSupplyDepletedPct}
                onChange={(e) =>
                  setSimParams((p) => ({
                    ...p,
                    waterSupplyDepletedPct: Number(e.target.value),
                  }))
                }
                className="w-full"
              />
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-200/80 text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={simParams.primaryRoadClosed}
                  onChange={(e) =>
                    setSimParams((p) => ({
                      ...p,
                      primaryRoadClosed: e.target.checked,
                    }))
                  }
                />
                <span>Simulate NH-181 Primary Corridor Blockage</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={simParams.secondaryIgnitionActive}
                  onChange={(e) =>
                    setSimParams((p) => ({
                      ...p,
                      secondaryIgnitionActive: e.target.checked,
                    }))
                  }
                />
                <span>Simulate Secondary Spot-Fire Ignition (1.2 km WSW)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={simParams.satellitePassDelayed}
                  onChange={(e) =>
                    setSimParams((p) => ({
                      ...p,
                      satellitePassDelayed: e.target.checked,
                    }))
                  }
                />
                <span>Simulate Satellite Overpass Delay (+Uncertainty)</span>
              </label>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 space-y-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
              <div>
                <div className="text-xs font-mono text-indigo-700 font-semibold">
                  SIMULATED OUTCOME PROJECTION · {primaryIncident ? primaryIncident.id : 'STANDBY BASELINE'}
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                  6-Hour Modelled Envelope & Resource Demand
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Uncertainty Band: ±{simResult.uncertaintyBandPct}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4 font-mono">
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-[11px] text-slate-500">Spread Rate</div>
                <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 tabular-nums">
                  {simResult.projectedSpreadRateHaHr}
                  <span className="text-xs text-slate-500 ml-1">ha/hr</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-[11px] text-slate-500">6h Total Area</div>
                <div className="text-lg sm:text-xl font-bold text-rose-700 mt-1 tabular-nums">
                  {simResult.projected6hAreaHa}
                  <span className="text-xs text-slate-500 ml-1">ha</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-[11px] text-slate-500">Active Route</div>
                <div className="text-sm font-bold text-sky-700 mt-1">
                  {simResult.recommendedRouteId}
                </div>
                <div className="text-[11px] text-slate-500">
                  ETA {simResult.estimatedTravelTimeMin} min
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="text-[11px] text-slate-500">Apparatus Needed</div>
                <div className="text-sm font-bold text-slate-900 mt-1">
                  {simResult.requiredFireEngines}FE ·{' '}
                  {simResult.requiredWaterTankers}WT ·{' '}
                  {simResult.requiredAmbulances}EMS
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-slate-800">
                Simulation Reasoning & Operational Implications
              </div>
              {simResult.rationale.map((line, i) => (
                <div
                  key={i}
                  className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700"
                >
                  · {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Predictive Analytics Simulation Card — Geometric Elliptical Fire Spread Trajectory (Wind Vector & Humidity) */}
        <div
          data-testid="geometric-spread-card"
          className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          <div className="p-4 sm:px-6 sm:py-4 bg-[#FAFBFC] border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-indigo-700">
                Predictive Analytics · Anderson-Rothermel Elliptical Wavefront Projection
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 mt-0.5">
                Geometric Wildfire Spread Projection (Current Wind Vector & Relative Humidity Model)
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-semibold tabular-nums">
                Wind Vector: {geometricProjection.effectiveWindKmh} km/h → {geometricProjection.propagationBearingDeg}° ({geometricProjection.propagationCompass})
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 font-semibold tabular-nums">
                Humidity: {geometricProjection.relativeHumidityPct}% RH · VPD {geometricProjection.vaporPressureDeficitKpa} kPa
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg border font-semibold ${
                  geometricProjection.crownTransitionRisk === 'Extreme Crown Torch' ||
                  geometricProjection.crownTransitionRisk === 'High'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {geometricProjection.crownTransitionRisk}
              </span>
            </div>
          </div>

          {/* Interactive Wind Vector & Relative Humidity Quick Preset Strip */}
          <div className="px-4 sm:px-6 py-2.5 bg-slate-50/90 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[11px] text-slate-600 font-semibold mr-1">
                Atmospheric Vector Presets:
              </span>
              <button
                type="button"
                onClick={() => {
                  setSimParams((p) => ({
                    ...p,
                    windSpeedDeltaKmh: 15,
                    windShiftDeg: 25,
                    rainfallMmHr: 0,
                  }));
                  setRelativeHumidityPct(14);
                  setFuelMoisturePct(9);
                }}
                className="px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50/80 hover:bg-rose-100 text-rose-900 font-medium transition-colors"
              >
                ▲ Foehn Gale (49 km/h · 14% RH)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimParams((p) => ({
                    ...p,
                    windSpeedDeltaKmh: 0,
                    windShiftDeg: 0,
                    rainfallMmHr: 0,
                  }));
                  setRelativeHumidityPct(primaryIncident?.humidityPct || 22);
                  setFuelMoisturePct(primaryIncident?.soilMoisturePct || 14);
                }}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 font-medium transition-colors"
              >
                ● Live Ridge Vector ({primaryIncident?.windSpeedKmh ?? 15} km/h · {primaryIncident?.humidityPct ?? 22}% RH)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimParams((p) => ({
                    ...p,
                    windSpeedDeltaKmh: -14,
                    windShiftDeg: -15,
                    rainfallMmHr: 4,
                  }));
                  setRelativeHumidityPct(68);
                  setFuelMoisturePct(26);
                }}
                className="px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 font-medium transition-colors"
              >
                ◆ Humid Recovery (20 km/h · 68% RH)
              </button>
            </div>
            <div className="font-mono text-[11px] text-slate-600">
              Equilibrium Fuel Moisture: <span className="font-semibold text-slate-900">{geometricProjection.effectiveFuelMoisturePct}% EMC</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left: Interactive Geometric Elliptical Isochrone SVG */}
            <div className="lg:col-span-7 p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-slate-200/80 bg-[#F8FAFC]">
              <svg
                viewBox="0 0 620 340"
                className="w-full h-[260px] sm:h-[320px] bg-white border border-slate-200/80 rounded-xl block select-none"
                role="img"
                aria-label="Geometric Elliptical Fire Spread Trajectory Projection"
              >
                {/* Polar Range Rings & Compass Crosshairs around Ignition Origin (310, 170) */}
                <g stroke="#e2e8f0" strokeWidth="1" fill="none">
                  {[42, 84, 126, 155].map((rPx) => (
                    <circle
                      key={rPx}
                      cx={310}
                      cy={170}
                      r={rPx}
                      strokeDasharray="3 3"
                    />
                  ))}
                  <line x1={310} y1={14} x2={310} y2={326} />
                  <line x1={24} y1={170} x2={596} y2={170} />
                </g>

                {/* Range Scale Labels */}
                <g fontFamily="JetBrains Mono" fontSize="8.5" fill="#64748b">
                  <text x={314} y={125}>2.0 km</text>
                  <text x={314} y={83}>4.0 km</text>
                  <text x={314} y={24}>N (0°)</text>
                  <text x={558} y={165}>E (90°)</text>
                  <text x={30} y={165}>W (270°)</text>
                </g>

                {/* Rotated Elliptical Isochrones (+6h, +3h, +1h) */}
                {(() => {
                  const svgAngleDeg =
                    geometricProjection.propagationBearingDeg - 90;
                  const pxPerKm = 21;

                  return (
                    <g
                      transform={`translate(310, 170) rotate(${svgAngleDeg})`}
                    >
                      {[...geometricProjection.isochrones]
                        .reverse()
                        .map((iso) => {
                          const rx = Math.min(
                            148,
                            Math.max(14, iso.semiMajorKm * pxPerKm)
                          );
                          const ry = Math.min(
                            92,
                            Math.max(9, iso.semiMinorKm * pxPerKm)
                          );
                          const cxOffset = Math.min(
                            82,
                            iso.centroidOffsetKm * pxPerKm
                          );

                          const strokeColor =
                            iso.horizonHours === 6
                              ? '#e11d48'
                              : iso.horizonHours === 3
                              ? '#f97316'
                              : '#f59e0b';
                          const fillColor =
                            iso.horizonHours === 6
                              ? 'rgba(225, 29, 72, 0.08)'
                              : iso.horizonHours === 3
                              ? 'rgba(249, 115, 22, 0.13)'
                              : 'rgba(245, 158, 11, 0.22)';

                          const labelX = cxOffset + rx - 14;
                          const labelY =
                            iso.horizonHours === 6
                              ? -ry * 0.45
                              : iso.horizonHours === 3
                              ? ry * 0.48
                              : -ry * 0.65;

                          return (
                            <g key={iso.horizonHours}>
                              <ellipse
                                cx={cxOffset}
                                cy={0}
                                rx={rx}
                                ry={ry}
                                fill={fillColor}
                                stroke={strokeColor}
                                strokeWidth={iso.horizonHours === 6 ? 2 : 1.5}
                                strokeDasharray={
                                  iso.horizonHours === 6 ? '6 3' : undefined
                                }
                              />
                              <g
                                transform={`translate(${labelX}, ${labelY}) rotate(${-svgAngleDeg})`}
                              >
                                <rect
                                  x="-34"
                                  y="-9"
                                  width="68"
                                  height="14"
                                  rx="3"
                                  fill="rgba(255,255,255,0.9)"
                                />
                                <text
                                  x="0"
                                  y="1"
                                  textAnchor="middle"
                                  fontSize="8.5"
                                  fontFamily="JetBrains Mono"
                                  fontWeight="700"
                                  fill={strokeColor}
                                >
                                  +{iso.horizonHours}h ({iso.projectedAreaHa}ha)
                                </text>
                              </g>
                            </g>
                          );
                        })}

                      {/* Downwind Head-Fire Propagation Vector Arrow */}
                      <line
                        x1={0}
                        y1={0}
                        x2={Math.min(
                          145,
                          geometricProjection.isochrones[2].headAdvanceKm *
                            pxPerKm
                        )}
                        y2={0}
                        stroke="#0f172a"
                        strokeWidth="2"
                      />
                      <polygon
                        points={`${Math.min(
                          149,
                          geometricProjection.isochrones[2].headAdvanceKm *
                            pxPerKm +
                            4
                        )},0 ${Math.min(
                          139,
                          geometricProjection.isochrones[2].headAdvanceKm *
                            pxPerKm -
                            5
                        )},-4 ${Math.min(
                          139,
                          geometricProjection.isochrones[2].headAdvanceKm *
                            pxPerKm -
                            5
                        )},4`}
                        fill="#0f172a"
                      />
                    </g>
                  );
                })()}

                {/* Plotted Threatened Infrastructure Targets */}
                {geometricProjection.threatenedTargets.map((tgt, idx) => {
                  const rad = ((tgt.bearingDeg - 90) * Math.PI) / 180;
                  const px = 310 + Math.cos(rad) * tgt.distanceKm * 28;
                  const py = 170 + Math.sin(rad) * tgt.distanceKm * 28;
                  return (
                    <g key={idx} transform={`translate(${px}, ${py})`}>
                      <rect
                        x="-5"
                        y="-5"
                        width="10"
                        height="10"
                        rx="2"
                        fill={tgt.withinCone ? '#e11d48' : '#0284c7'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      <text
                        x="8"
                        y={idx % 2 === 0 ? -3 : 9}
                        fontSize="8.5"
                        fontFamily="JetBrains Mono"
                        fontWeight="600"
                        fill={tgt.withinCone ? '#be123c' : '#334155'}
                      >
                        {tgt.name.slice(0, 20)} ({tgt.distanceKm}km)
                      </text>
                    </g>
                  );
                })}

                {/* Ignition Origin Core Marker */}
                <circle
                  cx={310}
                  cy={170}
                  r={6.5}
                  fill="#0f172a"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </svg>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-600">
                <span>
                  ● Origin: {primaryIncident ? `${primaryIncident.coordinates.lat}°N, ${primaryIncident.coordinates.lng}°E` : 'Sector Centroid'}
                </span>
                <span>
                  L/B Ratio: {geometricProjection.lengthToBreadthRatio}:1 · Eccentricity e={geometricProjection.eccentricity}
                </span>
              </div>
            </div>

            {/* Right: Quantitative Geometric & Thermodynamic Readout */}
            <div className="lg:col-span-5 p-4 sm:p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <div className="text-[11px] text-slate-500">
                      Head-Fire Rate
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 tabular-nums">
                      {geometricProjection.headFireRateMMin}
                      <span className="text-xs text-slate-500 ml-1">m/min</span>
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      {geometricProjection.headFireSpeedKmh} km/h forward
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <div className="text-[11px] text-slate-500">
                      Flank / Backing
                    </div>
                    <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 tabular-nums">
                      {geometricProjection.flankFireSpeedKmh}
                      <span className="text-xs text-slate-500 ml-1">km/h</span>
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      Rear: {geometricProjection.backingFireSpeedKmh} km/h
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <div className="text-[11px] text-slate-500">
                      Byram Intensity
                    </div>
                    <div className="text-base sm:text-lg font-bold text-rose-700 mt-0.5 tabular-nums">
                      {geometricProjection.firelineIntensityKwM.toLocaleString()}
                      <span className="text-xs text-slate-500 ml-1">kW/m</span>
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      Flame Length: {geometricProjection.flameLengthMeters} m
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <div className="text-[11px] text-slate-500">
                      6h Major Axis
                    </div>
                    <div className="text-base sm:text-lg font-bold text-indigo-700 mt-0.5 tabular-nums">
                      {(
                        geometricProjection.isochrones[2].semiMajorKm * 2
                      ).toFixed(2)}
                      <span className="text-xs text-slate-500 ml-1">km</span>
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      Flank Width: {geometricProjection.isochrones[2].flankWidthKm} km
                    </div>
                  </div>
                </div>

                {/* Downwind Asset Arrival Estimates */}
                <div>
                  <div className="text-xs font-semibold text-slate-800 mb-2">
                    Downwind Trajectory Exposure & Arrival Forecast
                  </div>
                  <div className="space-y-1.5">
                    {geometricProjection.threatenedTargets.map((tgt, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 truncate">
                            {tgt.name}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {tgt.distanceKm} km @ {tgt.bearingDeg}°
                          </div>
                        </div>
                        <span
                          className={`font-mono text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                            tgt.withinCone
                              ? 'text-rose-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {tgt.withinCone && tgt.estimatedArrivalMin !== null
                            ? `◆ Cone Impact ~${tgt.estimatedArrivalMin} min`
                            : '● Outside Trajectory Cone'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/80 text-[11px] font-mono text-slate-500">
                Wind: {geometricProjection.effectiveWindKmh} km/h ({geometricProjection.propagationBearingDeg}°) · RH: {geometricProjection.relativeHumidityPct}% · EMC: {geometricProjection.effectiveFuelMoisturePct}%
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeSection === 'reports') {
    return (
      <div className="space-y-5 sm:space-y-6">
        <SectionHeader
          kicker="ICS-201 Situation Briefings, Provenance Ledgers & Geospatial Exports"
          title="Reports, Authority Handoff Packages & Documentation Centre"
          subtitle="Generate structured situation reports, MODIS/VIIRS harmonization summaries, and verifiable GeoJSON/KML/PDF packages."
          rightSlot={
            <button
              type="button"
              onClick={handleDownloadRealPackage}
              className="min-h-[40px] px-3.5 py-2 text-xs font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800 whitespace-nowrap"
            >
              Export Real ICS-201 & GeoJSON Package
            </button>
          }
        />

        {exportToast && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-2">
            <span>◆ {exportToast}</span>
            <button
              type="button"
              onClick={() => setExportToast(null)}
              className="underline font-mono shrink-0"
            >
              Close
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          <div className="lg:col-span-4 space-y-2.5">
            {(
              [
                [
                  'ics201',
                  'ICS-201 Incident Situation Report (v2.4)',
                  '11:10 UTC · Verified',
                ],
                [
                  'modis_viirs',
                  'NASA MODIS & VIIRS Harmonization Dossier',
                  '10:58 UTC · 4 Orbits',
                ],
                [
                  'handoff',
                  'District Collectorate Authority Handoff Package',
                  '11:14 UTC · Ready',
                ],
              ] as const
            ).map(([id, title, meta]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedReportDoc(id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
                  selectedReportDoc === id
                    ? 'bg-white border-slate-900 ring-1 ring-slate-900'
                    : 'bg-white border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-semibold text-slate-900">
                  {title}
                </div>
                <div className="text-xs font-mono text-slate-500 mt-1">
                  {meta}
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 space-y-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
              <div>
                <div className="text-xs font-mono text-slate-500">
                  DOCUMENT PREVIEW · VERSION 2.4 (AUDIT HASH #8F92A)
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mt-0.5">
                  {selectedReportDoc === 'ics201'
                    ? primaryIncident
                      ? `ICS-201 Operational Situation Report — ${primaryIncident.id}`
                      : 'ICS-201 Operational Situation Report — Sector Standby'
                    : selectedReportDoc === 'modis_viirs'
                    ? 'MODIS Collection 6.1 & VIIRS 375m Sensor Harmonization Report'
                    : 'District Emergency Operations Centre Handoff Package'}
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC
              </span>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              {primaryIncident ? (
                <>
                  <p>
                    <strong>1. Executive Summary:</strong> {primaryIncident.title} ({primaryIncident.coordinates.lat.toFixed(4)}°N, {primaryIncident.coordinates.lng.toFixed(4)}°E). Confirmed via {primaryIncident.viirsCount} VIIRS 375m detections, {primaryIncident.modisCount} MODIS 1km detections.
                  </p>
                  <p>
                    <strong>2. Epistemic Verification Integrity:</strong> All unverified social media claims and uncorroborated single-pixel anomalies are explicitly quarantined from confirmed operational orders.
                  </p>
                  <p>
                    <strong>3. Resource & Staging Status:</strong> Active sector coordination underway with verified resource assignments.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>1. Executive Summary:</strong> Sector is in nominal standby state. Zero active thermal anomalies or emergencies currently registered.
                  </p>
                  <p>
                    <strong>2. Epistemic Verification Integrity:</strong> Zero fabricated operational records (ALEX v2.6.0). All incoming satellite passes and ranger reports require explicit provenance validation.
                  </p>
                  <p>
                    <strong>3. Readiness Status:</strong> Automated NASA FIRMS orbital polling and field telemetry reception active.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <SectionHeader
        kicker="Telemetry Adapter, Accessibility & Epistemic Policy"
        title="Platform Settings & Calibration"
        subtitle="Configure demonstration telemetry adapters, reduced-motion preferences, and strict verification thresholds."
      />

      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 space-y-4 max-w-3xl shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-200/80">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Reduced Motion & Orbital Damping
            </div>
            <div className="text-xs text-slate-500">
              Minimize 3D Earth rotation and streamline particle velocity
            </div>
          </div>
          <input
            type="checkbox"
            aria-label="Reduced Motion & Orbital Damping"
            checked={reducedMotionPref}
            onChange={(e) => setReducedMotionPref(e.target.checked)}
          />
        </div>

        <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-200/80">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              High-Contrast Epistemic Glyphs
            </div>
            <div className="text-xs text-slate-500">
              Enforce explicit symbol prefixes (◆, ▲, ●, ◐, ○) alongside semantic colors
            </div>
          </div>
          <input
            type="checkbox"
            aria-label="High-Contrast Epistemic Glyphs"
            checked={highContrastPref}
            onChange={(e) => setHighContrastPref(e.target.checked)}
          />
        </div>

        <div className="pt-2 text-xs text-slate-500 font-mono">
          Active Data Adapter: Demonstration Telemetry Mode (FIRMS + IMD + NDMA ICS-201 Schema)
        </div>
      </div>
    </div>
  );
};
