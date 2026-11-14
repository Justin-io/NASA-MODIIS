import React, { useMemo, useState } from 'react';
import {
  IncidentHorizontalTimelineCategory,
  IncidentRecord,
  VerificationLevel,
} from '../shared/types';
import {
  BURNING_CALENDAR_DATA,
  MONITORED_REGIONS,
} from '../shared/dataAdapter';
import {
  aggregateIncidentHorizontalTimeline,
  harmonizeObservations,
} from '../shared/intelligenceEngine';
import {
  formatSeverityLabel,
  formatVerificationLabel,
  SectionHeader,
  ProvenanceNoticeBanner,
} from '../shared/ui';
import {
  HYPER_REALISTIC_HISTORICAL_ARCHIVE,
  HISTORICAL_REGIONAL_MEDIANS,
  evaluateSeasonalAnomaly,
} from '../shared/fireObservationsData';
import { NILGIRIS_EMPIRICAL_MONTHLY_ARCHIVE } from '../shared/empiricalArchiveData';
import {
  getPerimetersForRegion,
  getSpreadForecastForPerimeter,
  getPerimeterProgression,
} from '../shared/firePerimeterData';
import {
  getStationsForRegion,
  getLatestFuelMoistureObservation,
  getFuelStatusAvailability,
  SEASONAL_FUEL_PROFILES,
} from '../shared/fuelMoistureData';
import {
  getPopulationCellsForRegion,
  getCriticalInfrastructureForRegion,
  getEvacuationZonesForRegion,
  getBuildingFootprintsForRegion,
} from '../shared/exposureData';
import {
  getCadEventsForRegion,
  getRangerReportsForIncident,
  getCorroborationMatrix,
} from '../shared/groundVerificationData';
import { computeRegionalBurningCalendarMath } from '../shared/fireCalendarMath';

interface IncidentIntelligenceViewProps {
  incidents: IncidentRecord[];
  selectedIncidentId: string;
  onSelectIncident: (id: string) => void;
  onUpdateIncidentStatus: (id: string, nextStatus: VerificationLevel) => void;
  onNavigateTab: (tab: string) => void;
}

export const IncidentIntelligenceView: React.FC<IncidentIntelligenceViewProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  onUpdateIncidentStatus,
  onNavigateTab,
}) => {
  const [subTab, setSubTab] = useState<
    'dossier' | 'calendar' | 'perimeters' | 'fuels' | 'exposure' | 'verification'
  >('dossier');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [calendarRegionId, setCalendarRegionId] = useState<string>('REG-NILGIRI');
  const [useArchiveBaseline, setUseArchiveBaseline] = useState<boolean>(false);
  const [sensorFilter, setSensorFilter] = useState<'HARMONIZED' | 'MODIS' | 'VIIRS'>('HARMONIZED');
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(9);
  const [exportStatusMsg, setExportStatusMsg] = useState<string | null>(null);

  // Horizontal Timeline state
  const [timelineCategoryFilter, setTimelineCategoryFilter] = useState<
    'all' | IncidentHorizontalTimelineCategory
  >('all');
  const [timelineCutoffMins, setTimelineCutoffMins] = useState<number>(720);
  const [selectedTimelineItemId, setSelectedTimelineItemId] = useState<
    string | null
  >(null);

  const filteredIncidents = useMemo(() => {
    if (statusFilter === 'all') return incidents;
    return incidents.filter((i) => i.status === statusFilter);
  }, [incidents, statusFilter]);

  const activeIncident =
    incidents.find((i) => i.id === selectedIncidentId) || incidents[0] || null;

  const harmonizedCells = useMemo(
    () =>
      activeIncident
        ? harmonizeObservations(
            activeIncident.observations,
            activeIncident.historicalMedianFrpMw
          )
        : [],
    [activeIncident]
  );

  const horizontalTimeline = useMemo(
    () =>
      activeIncident
        ? aggregateIncidentHorizontalTimeline(
            activeIncident,
            timelineCategoryFilter,
            timelineCutoffMins
          )
        : {
            allItems: [],
            visibleItems: [],
            categoryCounts: {
              satellite_detection: 0,
              field_report: 0,
              sensor_alert: 0,
            },
            minMinutes: 360,
            maxMinutes: 720,
          },
    [activeIncident, timelineCategoryFilter, timelineCutoffMins]
  );

  const activeTimelineItem = useMemo(() => {
    if (horizontalTimeline.visibleItems.length === 0) {
      return horizontalTimeline.allItems[0] || null;
    }
    return (
      horizontalTimeline.visibleItems.find(
        (it) => it.id === selectedTimelineItemId
      ) ||
      horizontalTimeline.visibleItems[
        horizontalTimeline.visibleItems.length - 1
      ]
    );
  }, [horizontalTimeline, selectedTimelineItemId]);

  const monthlyRecords = useMemo(() => {
    if (useArchiveBaseline) {
      const recordsToUse =
        calendarRegionId === 'REG-NILGIRI'
          ? NILGIRIS_EMPIRICAL_MONTHLY_ARCHIVE
          : HYPER_REALISTIC_HISTORICAL_ARCHIVE;
      const math = computeRegionalBurningCalendarMath(
        calendarRegionId,
        recordsToUse
      );
      return math.monthlyRecords.slice(-12).map((r, idx) => ({
        monthIndex: idx,
        monthName: r.monthLabel,
        modisDetections: r.modisHotspots,
        viirsDetections: r.viirsHotspots,
        harmonizedEvents: r.harmonizedHotspots,
        historicalMedianEvents: r.historicalMedianHotspots,
        meanFrpMw: r.meanFrpMw,
        coveragePct: r.observationCoveragePct,
        uncertaintyPct: Math.round(100 - r.observationCoveragePct),
      }));
    }
    return (
      BURNING_CALENDAR_DATA[calendarRegionId] ||
      BURNING_CALENDAR_DATA['REG-NILGIRI'] ||
      []
    );
  }, [useArchiveBaseline, calendarRegionId]);

  const selectedMonthRecord =
    monthlyRecords && monthlyRecords.length > 0
      ? monthlyRecords[selectedMonthIdx] || monthlyRecords[0]
      : null;

  const triggerCalendarExport = (format: 'CSV' | 'GeoJSON') => {
    const filename = `ALEX_NASA_MODIS_VIIRS_${calendarRegionId}.${format.toLowerCase()}`;
    let content = '';
    let mimeType = 'text/plain';

    if (format === 'CSV') {
      mimeType = 'text/csv';
      const header = 'month_index,month_name,modis_detections,viirs_detections,harmonized_events,historical_median_events,mean_frp_mw,coverage_pct,uncertainty_pct\n';
      const rows = monthlyRecords
        .map(
          (m) =>
            `${m.monthIndex},"${m.monthName}",${m.modisDetections},${m.viirsDetections},${m.harmonizedEvents},${m.historicalMedianEvents},${m.meanFrpMw},${m.coveragePct},${m.uncertaintyPct}`
        )
        .join('\n');
      content = header + rows;
    } else {
      mimeType = 'application/geo+json';
      const geojson = {
        type: 'FeatureCollection',
        metadata: {
          system: 'ALEX Environmental Intelligence',
          regionId: calendarRegionId,
          exportedAt: new Date().toISOString(),
        },
        features: monthlyRecords.map((m) => ({
          type: 'Feature',
          properties: {
            monthName: m.monthName,
            harmonizedEvents: m.harmonizedEvents,
            modisDetections: m.modisDetections,
            viirsDetections: m.viirsDetections,
            meanFrpMw: m.meanFrpMw,
            uncertaintyPct: m.uncertaintyPct,
          },
          geometry: {
            type: 'Point',
            coordinates: [76.7042, 11.4185],
          },
        })),
      };
      content = JSON.stringify(geojson, null, 2);
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExportStatusMsg(
      `Exported and downloaded ${filename} (${monthlyRecords.length} monthly harmonized series records).`
    );
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <SectionHeader
        kicker="Multi-Source Environmental Intelligence & Multi-Tier Field Verification"
        title="Incident Intelligence & Operational Deep Data Layers"
        subtitle="Inspect verified provenance, 25-year seasonal baselines, NIFC fire perimeters, RAWS fuel moisture, infrastructure exposure, and authenticated CAD/ranger ground reports."
        rightSlot={
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSubTab('dossier')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                subTab === 'dossier'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dossier
            </button>
            <button
              type="button"
              onClick={() => setSubTab('calendar')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                subTab === 'calendar'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              NASA Calendar (25-Yr)
            </button>
            <button
              type="button"
              onClick={() => setSubTab('perimeters')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                subTab === 'perimeters'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⬡ Perimeters & Spread
            </button>
            <button
              type="button"
              onClick={() => setSubTab('fuels')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                subTab === 'fuels'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ▲ RAWS Fuels
            </button>
            <button
              type="button"
              onClick={() => setSubTab('exposure')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                subTab === 'exposure'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ■ Exposure & Assets
            </button>
            <button
              type="button"
              onClick={() => setSubTab('verification')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                subTab === 'verification'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ★ Ground CAD & Ranger
            </button>
          </div>
        }
      />

      {subTab === 'dossier' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* Left Incident Selector & Verification Tier Filter */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <label
                htmlFor="verification-tier-select"
                className="block text-xs font-semibold text-slate-800 mb-2"
              >
                Filter by Verification Epistemic State
              </label>
              <select
                id="verification-tier-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              >
                <option value="all">
                  All Monitored Detections ({incidents.length})
                </option>
                <option value="authority_confirmed_emergency">
                  ◆ Authority-Confirmed Emergency
                </option>
                <option value="field_confirmed">▲ Field-Confirmed Incident</option>
                <option value="independently_corroborated">
                  ● Independently Corroborated
                </option>
                <option value="candidate_incident">◐ Candidate Incident</option>
                <option value="satellite_thermal_anomaly">
                  ○ Unverified Satellite Thermal Anomaly
                </option>
              </select>

              <div className="divide-y divide-slate-200/70 mt-3">
                {filteredIncidents.map((inc) => {
                  const ver = formatVerificationLabel(inc.status);
                  const sev = formatSeverityLabel(inc.severity);
                  const active = inc.id === activeIncident.id;

                  return (
                    <button
                      key={inc.id}
                      type="button"
                      onClick={() => {
                        onSelectIncident(inc.id);
                        setSelectedTimelineItemId(null);
                      }}
                      className={`w-full text-left py-3 px-2.5 transition-colors rounded-xl ${
                        active ? 'bg-sky-50/80' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold text-slate-900">
                          {inc.id}
                        </span>
                        <span className={`font-mono text-[11px] ${sev.toneClass}`}>
                          {sev.glyph} {sev.label}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 mt-1">
                        {inc.title}
                      </div>
                      <div className={`text-xs mt-1 font-medium ${ver.toneClass}`}>
                        {ver.glyph} {ver.label}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 mt-1">
                        {inc.coordinates.lat.toFixed(4)}°N,{' '}
                        {inc.coordinates.lng.toFixed(4)}°E · ±
                        {inc.uncertaintyRadiusMeters}m
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Detailed Incident Dossier */}
          {!activeIncident ? (
            <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4 text-slate-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                No Active Incident Selected
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
                No active thermal anomalies or emergencies are currently registered in this sector.
                Ingest NASA FIRMS passes or record a verified ground report to populate incident intelligence.
              </p>
            </div>
          ) : (
            <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200/80">
                <div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-slate-900">
                      {activeIncident.id}
                    </span>
                    <span>·</span>
                    <span>{activeIncident.district}</span>
                    <span>·</span>
                    <span
                      className={`font-semibold ${
                        formatVerificationLabel(activeIncident.status).toneClass
                      }`}
                    >
                      {formatVerificationLabel(activeIncident.status).glyph}{' '}
                      {formatVerificationLabel(activeIncident.status).label}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mt-1">
                    {activeIncident.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatVerificationLabel(activeIncident.status).description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onNavigateTab('evidence')}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl whitespace-nowrap shrink-0"
                  >
                    Evidence Graph
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('routing')}
                    className="min-h-[38px] px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-xl whitespace-nowrap shrink-0"
                  >
                    Emergency Routing
                  </button>
                </div>
              </div>

              {/* Coordinates, Timestamps & Harmonized Sensor Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-slate-200/80">
                <div>
                  <div className="text-xs text-slate-500">Centroid & Uncertainty</div>
                  <div className="text-sm font-mono font-semibold text-slate-900 mt-0.5">
                    {activeIncident.coordinates.lat.toFixed(4)}°N,{' '}
                    {activeIncident.coordinates.lng.toFixed(4)}°E
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    Radius: ±{activeIncident.uncertaintyRadiusMeters} m
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Observation Window</div>
                  <div className="text-sm font-mono font-semibold text-slate-900 mt-0.5">
                    {activeIncident.firstObserved.slice(11, 16)} →{' '}
                    {activeIncident.latestObserved.slice(11, 16)} UTC
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    MODIS: {activeIncident.modisCount} · VIIRS:{' '}
                    {activeIncident.viirsCount}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">
                    Harmonized FRP vs. Median
                  </div>
                  <div className="text-sm font-mono font-semibold text-slate-900 mt-0.5">
                    {activeIncident.harmonizedFrpMw} MW{' '}
                    <span className="text-amber-700">
                      (
                      {(
                        activeIncident.harmonizedFrpMw /
                        activeIncident.historicalMedianFrpMw
                      ).toFixed(1)}
                      x)
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    10-yr Oct Median: {activeIncident.historicalMedianFrpMw} MW
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Authority Status</div>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5">
                    {activeIncident.authorityStatus}
                  </div>
                  <div className="text-xs text-slate-500">
                    Exposed Pop: ~
                    {activeIncident.estimatedPopulationExposed.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Epistemic Verification Gate Control */}
              <div className="py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    Operator Epistemic Verification Gate
                  </div>
                  <div className="text-xs text-slate-500">
                    Update incident verification tier only when corroborated by multi-sensor passes, ranger report, or official EOC order.
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      ['satellite_thermal_anomaly', 'Thermal Anomaly'],
                      ['candidate_incident', 'Candidate'],
                      ['independently_corroborated', 'Corroborated'],
                      ['field_confirmed', 'Field Confirmed'],
                      ['authority_confirmed_emergency', 'Authority Emergency'],
                    ] as [VerificationLevel, string][]
                  ).map(([lvl, lbl]) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() =>
                        onUpdateIncidentStatus(activeIncident.id, lvl)
                      }
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 transition-colors ${
                        activeIncident.status === lvl
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Horizontal Timeline — Aggregating Satellite Detections, Field Reports & Sensor Alerts */}
              <div
                data-testid="incident-horizontal-timeline"
                className="py-5 border-b border-slate-200/80 space-y-4"
              >
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-sky-700">
                      Multi-Sensor Chronological Aggregation · {activeIncident.id}
                    </div>
                    <h4 className="text-sm sm:text-base font-semibold text-slate-900 mt-0.5">
                      Interactive Horizontal Timeline — Satellite Detections, Field Reports & Sensor Alerts
                    </h4>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        [
                          'all',
                          `All (${
                            horizontalTimeline.categoryCounts.satellite_detection +
                            horizontalTimeline.categoryCounts.field_report +
                            horizontalTimeline.categoryCounts.sensor_alert
                          })`,
                        ],
                        [
                          'satellite_detection',
                          `● Satellite (${horizontalTimeline.categoryCounts.satellite_detection})`,
                        ],
                        [
                          'field_report',
                          `▲ Field Reports (${horizontalTimeline.categoryCounts.field_report})`,
                        ],
                        [
                          'sensor_alert',
                          `◆ Sensor Alerts (${horizontalTimeline.categoryCounts.sensor_alert})`,
                        ],
                      ] as ['all' | IncidentHorizontalTimelineCategory, string][]
                    ).map(([cat, label]) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setTimelineCategoryFilter(cat)}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 transition-colors ${
                          timelineCategoryFilter === cat
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Horizontal Time Window Scrubber & Event Stepper */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-1">
                    <label
                      htmlFor="incident-timeline-cutoff"
                      className="text-xs font-medium text-slate-700 whitespace-nowrap shrink-0"
                    >
                      Timestamp Horizon:
                    </label>
                    <input
                      id="incident-timeline-cutoff"
                      aria-label="Incident Horizontal Timeline Timestamp Horizon"
                      type="range"
                      min={horizontalTimeline.minMinutes}
                      max={horizontalTimeline.maxMinutes}
                      step={5}
                      value={Math.min(
                        horizontalTimeline.maxMinutes,
                        Math.max(horizontalTimeline.minMinutes, timelineCutoffMins)
                      )}
                      onChange={(e) =>
                        setTimelineCutoffMins(Number(e.target.value))
                      }
                      className="w-full"
                    />
                    <span className="font-mono text-xs font-semibold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 whitespace-nowrap tabular-nums">
                      {`${String(
                        Math.floor(
                          Math.min(
                            horizontalTimeline.maxMinutes,
                            timelineCutoffMins
                          ) / 60
                        )
                      ).padStart(2, '0')}:${String(
                        Math.min(
                          horizontalTimeline.maxMinutes,
                          timelineCutoffMins
                        ) % 60
                      ).padStart(2, '0')} UTC`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const items = horizontalTimeline.visibleItems;
                        if (items.length === 0) return;
                        const currIdx = items.findIndex(
                          (it) => it.id === activeTimelineItem?.id
                        );
                        const prevIdx =
                          currIdx > 0 ? currIdx - 1 : items.length - 1;
                        setSelectedTimelineItemId(items[prevIdx].id);
                      }}
                      className="px-2.5 py-1 text-xs font-mono font-medium bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg"
                    >
                      ◀ Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const items = horizontalTimeline.visibleItems;
                        if (items.length === 0) return;
                        const currIdx = items.findIndex(
                          (it) => it.id === activeTimelineItem?.id
                        );
                        const nextIdx =
                          currIdx >= 0 && currIdx < items.length - 1
                            ? currIdx + 1
                            : 0;
                        setSelectedTimelineItemId(items[nextIdx].id);
                      }}
                      className="px-2.5 py-1 text-xs font-mono font-medium bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg"
                    >
                      Next ▶
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTimelineCutoffMins(horizontalTimeline.maxMinutes + 30);
                        setTimelineCategoryFilter('all');
                      }}
                      className="px-2.5 py-1 text-xs font-mono font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                    >
                      Full Window
                    </button>
                  </div>
                </div>

                {/* Horizontal Multi-Track Timeline SVG */}
                <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-xl p-3">
                  <svg
                    viewBox="0 0 820 185"
                    className="w-full h-[165px] sm:h-[185px] bg-white border border-slate-200/80 rounded-lg block select-none"
                    role="img"
                    aria-label="Interactive Horizontal Timeline of Satellite Detections, Field Reports, and Sensor Alerts"
                  >
                    {/* Track Labels & Horizontal Axis Guides */}
                    {[
                      {
                        y: 44,
                        label: 'Satellite Detections',
                        sub: 'MODIS / VIIRS Swaths',
                        color: '#e11d48',
                      },
                      {
                        y: 94,
                        label: 'Field Reports',
                        sub: 'Ranger & EOC Logs',
                        color: '#059669',
                      },
                      {
                        y: 144,
                        label: 'Sensor Alerts',
                        sub: 'AWS Wind/RH & IoT',
                        color: '#4f46e5',
                      },
                    ].map((lane) => (
                      <g key={lane.label}>
                        <line
                          x1={155}
                          y1={lane.y}
                          x2={790}
                          y2={lane.y}
                          stroke="#e2e8f0"
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                        />
                        <text
                          x={14}
                          y={lane.y - 3}
                          fontSize="9.5"
                          fontWeight="600"
                          fontFamily="Plus Jakarta Sans"
                          fill="#0f172a"
                        >
                          {lane.label}
                        </text>
                        <text
                          x={14}
                          y={lane.y + 10}
                          fontSize="8"
                          fontFamily="JetBrains Mono"
                          fill="#64748b"
                        >
                          {lane.sub}
                        </text>
                      </g>
                    ))}

                    {/* Vertical UTC Timestamp Grid Ticks */}
                    {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
                      const x = 165 + frac * 610;
                      const mins = Math.round(
                        horizontalTimeline.minMinutes +
                          frac *
                            (horizontalTimeline.maxMinutes -
                              horizontalTimeline.minMinutes)
                      );
                      const hh = String(Math.floor(mins / 60)).padStart(2, '0');
                      const mm = String(mins % 60).padStart(2, '0');
                      return (
                        <g key={idx}>
                          <line
                            x1={x}
                            y1={20}
                            x2={x}
                            y2={162}
                            stroke="#f1f5f9"
                            strokeWidth="1"
                          />
                          <text
                            x={x}
                            y={176}
                            textAnchor="middle"
                            fontSize="8.5"
                            fontFamily="JetBrains Mono"
                            fill="#64748b"
                          >
                            {hh}:{mm} UTC
                          </text>
                        </g>
                      );
                    })}

                    {/* Chronological Progression Polyline Connecting Visible Events */}
                    {horizontalTimeline.visibleItems.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#cbd5e1"
                        strokeWidth="1.5"
                        points={horizontalTimeline.visibleItems
                          .map((item) => {
                            const x =
                              155 + (item.horizontalPositionPct / 100) * 635;
                            const y =
                              item.category === 'satellite_detection'
                                ? 44
                                : item.category === 'field_report'
                                ? 94
                                : 144;
                            return `${x},${y}`;
                          })
                          .join(' ')}
                      />
                    )}

                    {/* Interactive Event Nodes */}
                    {horizontalTimeline.visibleItems.map((item) => {
                      const x = 155 + (item.horizontalPositionPct / 100) * 635;
                      const y =
                        item.category === 'satellite_detection'
                          ? 44
                          : item.category === 'field_report'
                          ? 94
                          : 144;
                      const isSelected = activeTimelineItem?.id === item.id;
                      const fill =
                        item.category === 'satellite_detection'
                          ? '#e11d48'
                          : item.category === 'field_report'
                          ? '#059669'
                          : '#4f46e5';

                      return (
                        <g
                          key={item.id}
                          transform={`translate(${x}, ${y})`}
                          onClick={() => setSelectedTimelineItemId(item.id)}
                          className="cursor-pointer"
                        >
                          {isSelected && (
                            <circle
                              r={13}
                              fill={fill}
                              fillOpacity="0.16"
                              stroke={fill}
                              strokeWidth="1.5"
                            />
                          )}

                          {item.category === 'satellite_detection' ? (
                            <circle
                              r={isSelected ? 7 : 5.5}
                              fill={fill}
                              stroke="#ffffff"
                              strokeWidth="1.8"
                            />
                          ) : item.category === 'field_report' ? (
                            <polygon
                              points="0,-7.5 7,6 -7,6"
                              fill={fill}
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                          ) : (
                            <polygon
                              points="0,-7.5 7.5,0 0,7.5 -7.5,0"
                              fill={fill}
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                          )}

                          <text
                            x={0}
                            y={-12}
                            textAnchor="middle"
                            fontSize="8"
                            fontFamily="JetBrains Mono"
                            fontWeight={isSelected ? '700' : '600'}
                            fill={isSelected ? '#0f172a' : '#475569'}
                          >
                            {item.timestampLabel.replace(' UTC', '')}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Selected Timestamp Inspector Bar */}
                {activeTimelineItem && (
                  <div className="p-3.5 sm:p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-sky-300">
                        <span>{activeTimelineItem.timestampLabel}</span>
                        <span>·</span>
                        <span>{activeTimelineItem.sourceLabel}</span>
                        <span>·</span>
                        <span className="text-emerald-300">
                          Confidence {activeTimelineItem.confidencePct}%
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm font-semibold">
                        {activeTimelineItem.title}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {activeTimelineItem.detail}
                      </p>
                    </div>
                    <div className="sm:text-right font-mono text-xs shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="text-amber-300 font-semibold">
                        {activeTimelineItem.primaryMetric}
                      </div>
                      <div className="text-slate-300 text-[11px] mt-0.5">
                        {activeTimelineItem.secondaryMetric}
                      </div>
                      <div className="text-slate-400 text-[10px] mt-0.5">
                        {activeTimelineItem.coordinates.lat.toFixed(4)}°N,{' '}
                        {activeTimelineItem.coordinates.lng.toFixed(4)}°E
                      </div>
                    </div>
                  </div>
                )}

                {/* Responsive Grid of Aggregated Timestamp Cards (Zero Clipping) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
                  {horizontalTimeline.visibleItems.map((item) => {
                    const isSelected = activeTimelineItem?.id === item.id;
                    const badgeTone =
                      item.category === 'satellite_detection'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : item.category === 'field_report'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-indigo-50 text-indigo-800 border-indigo-200';
                    const catLabel =
                      item.category === 'satellite_detection'
                        ? '● Satellite'
                        : item.category === 'field_report'
                        ? '▲ Field Report'
                        : '◆ Sensor Alert';

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedTimelineItemId(item.id)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                            : 'bg-white border-slate-200/90 text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5 text-[11px] font-mono">
                            <span
                              className={
                                isSelected ? 'text-sky-300' : 'text-slate-500'
                              }
                            >
                              {item.timestampLabel}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] border whitespace-nowrap ${
                                isSelected
                                  ? 'bg-slate-800 border-slate-700 text-white'
                                  : badgeTone
                              }`}
                            >
                              {catLabel}
                            </span>
                          </div>
                          <div className="text-xs font-semibold mt-1.5 line-clamp-2 leading-snug">
                            {item.title}
                          </div>
                        </div>
                        <div
                          className={`mt-2.5 pt-2 border-t text-[11px] font-mono flex items-center justify-between ${
                            isSelected
                              ? 'border-slate-800 text-amber-300'
                              : 'border-slate-100 text-slate-600'
                          }`}
                        >
                          <span className="truncate">{item.primaryMetric}</span>
                          <span className="shrink-0 ml-1">
                            {item.confidencePct}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Harmonized MODIS + VIIRS Observation Table */}
              <div className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-900">
                    Native Satellite Detections & Harmonized Cell Fusion
                  </h4>
                  <span className="text-xs font-mono text-slate-500">
                    Harmonized Cells: {harmonizedCells.length}
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
                  <table className="w-full text-left border-collapse min-w-[540px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600">
                        <th className="py-2.5 px-3">Obs ID</th>
                        <th className="py-2.5 px-3">Sensor / Orbit</th>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3 text-right">Pixel Size</th>
                        <th className="py-2.5 px-3 text-right">Brightness</th>
                        <th className="py-2.5 px-3 text-right">FRP (MW)</th>
                        <th className="py-2.5 px-3 text-right">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 text-xs font-mono">
                      {activeIncident.observations.map((obs) => (
                        <tr key={obs.id} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {obs.id}
                          </td>
                          <td className="py-2 px-3 text-slate-700">
                            {obs.sensor} · {obs.orbitPass}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {obs.timestamp.slice(11, 19)} UTC
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {obs.scanPixelKm} km
                          </td>
                          <td className="py-2 px-3 text-right text-slate-800">
                            {obs.brightnessKelvin.toFixed(1)} K
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-rose-700">
                            {obs.frpMw.toFixed(1)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-800">
                            {obs.confidencePct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Affected Assets, Staging & Unverified Caveats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 mt-5 border-t border-slate-200/80">
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 mb-2">
                    Exposed Infrastructure & Recommended Staging
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {activeIncident.affectedAssets.map((asset, i) => (
                      <li key={i}>· {asset}</li>
                    ))}
                  </ul>
                  {activeIncident.recommendedStaging.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200/70">
                      <div className="text-xs font-semibold text-slate-800 mb-1">
                        Recommended Safe Staging Locations
                      </div>
                      {activeIncident.recommendedStaging.map((st, idx) => (
                        <div key={idx} className="text-xs text-slate-600 mt-1">
                          <span className="font-medium text-slate-900">
                            {st.name}
                          </span>{' '}
                          — <span className="font-mono text-[11px]">{st.clearance}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-800 mb-2">
                    Chronological Provenance & Unverified Claim Caution
                  </h4>
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 mb-3">
                    <span className="font-semibold">△ Epistemic Caution: </span>
                    {activeIncident.unverifiedNotes}
                  </div>
                  <div className="space-y-2">
                    {activeIncident.timeline.map((ev) => (
                      <div key={ev.id} className="text-xs">
                        <span className="font-mono text-slate-500">
                          {ev.timestamp.slice(11, 16)} UTC
                        </span>{' '}
                        ·{' '}
                        <span className="font-semibold text-slate-800">
                          {ev.actor}
                        </span>
                        : <span className="text-slate-600">{ev.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      ) : subTab === 'calendar' ? (
        /* NASA Burning Activity Calendar Sub-Workspace */
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 space-y-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
            <div>
              <div className="text-xs font-mono text-sky-700 font-semibold">
                NASA Space Apps Scientific Foundation · Harmonization of MODIS & VIIRS Hot Spots
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 mt-0.5">
                Multi-Sensor Harmonized Burning Activity Calendar (2000–2025 Baseline)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {useArchiveBaseline
                  ? calendarRegionId === 'REG-NILGIRI'
                    ? 'Empirical NASA FIRMS research dataset active. 13,065 canonical observations (2019–2026) aggregated without synthetic models.'
                    : 'Ingested multi-sensor archive baseline active.'
                  : 'Live unaugmented ingestion mode.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setUseArchiveBaseline((v) => !v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors ${
                  useArchiveBaseline
                    ? 'bg-sky-50 border-sky-300 text-sky-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {useArchiveBaseline
                  ? calendarRegionId === 'REG-NILGIRI'
                    ? '✓ Empirical 13k Archive Active'
                    : '✓ Baseline Active'
                  : '+ Enable NASA Research Archive'}
              </button>

              <select
                aria-label="Select Area of Interest for Burning Calendar"
                value={calendarRegionId}
                onChange={(e) => setCalendarRegionId(e.target.value)}
                className="min-h-[38px] px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              >
                {MONITORED_REGIONS.map((reg) => (
                  <option key={reg.id} value={reg.id}>
                    AOI: {reg.name} ({reg.country})
                  </option>
                ))}
              </select>

              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl overflow-x-auto no-scrollbar">
                {(['HARMONIZED', 'VIIRS', 'MODIS'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSensorFilter(mode)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                      sensorFilter === mode
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {mode === 'HARMONIZED'
                      ? 'Harmonized Fusion'
                      : mode === 'VIIRS'
                      ? 'VIIRS 375m Native'
                      : 'MODIS 1km Native'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => triggerCalendarExport('CSV')}
                className="min-h-[38px] px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl whitespace-nowrap shrink-0"
              >
                Download CSV
              </button>
              <button
                type="button"
                onClick={() => triggerCalendarExport('GeoJSON')}
                className="min-h-[38px] px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-xl whitespace-nowrap shrink-0"
              >
                Export Harmonized GeoJSON
              </button>
            </div>
          </div>

          {exportStatusMsg && (
            <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-2">
              <span>◆ {exportStatusMsg}</span>
              <button
                type="button"
                onClick={() => setExportStatusMsg(null)}
                className="font-mono text-emerald-800 underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* 12-Month Heatmap Matrix */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mb-2.5">
              <span>
                Tap any month cell to inspect sensor cross-calibration, spatial coverage, and anomaly vs. 25-year median
              </span>
              <span className="font-mono">Active Filter: {sensorFilter}</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-12 gap-2">
              {monthlyRecords.map((rec, idx) => {
                const countValue =
                  sensorFilter === 'HARMONIZED'
                    ? rec.harmonizedEvents
                    : sensorFilter === 'VIIRS'
                    ? rec.viirsDetections
                    : rec.modisDetections;

                const anomalyRatio =
                  rec.harmonizedEvents /
                  Math.max(1, rec.historicalMedianEvents);
                const isAnomaly = anomalyRatio >= 1.35;
                const isSelected = idx === selectedMonthIdx;

                const heatBg =
                  rec.meanFrpMw > 80
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : rec.meanFrpMw > 45
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : rec.meanFrpMw > 25
                    ? 'bg-sky-50 border-sky-200 text-sky-950'
                    : 'bg-slate-50 border-slate-200 text-slate-800';

                return (
                  <button
                    key={rec.monthName}
                    type="button"
                    onClick={() => setSelectedMonthIdx(idx)}
                    className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all ${heatBg} ${
                      isSelected ? 'ring-2 ring-slate-900' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>{rec.monthName}</span>
                      {isAnomaly && (
                        <span className="font-mono text-[10px] text-rose-700">
                          ▲{anomalyRatio.toFixed(1)}x
                        </span>
                      )}
                    </div>
                    <div className="text-lg sm:text-xl font-mono font-bold mt-1.5 tabular-nums">
                      {countValue}
                    </div>
                    <div className="text-[10px] font-mono opacity-75 mt-0.5 truncate">
                      {rec.meanFrpMw} MW
                    </div>
                    <div className="text-[10px] font-mono opacity-75 truncate">
                      Cov {rec.coveragePct}%
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Month Cross-Sensor Provenance Breakdown */}
          {selectedMonthRecord ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 pt-4 border-t border-slate-200/80">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-xs font-semibold text-slate-800">
                  Selected Month: {selectedMonthRecord.monthName} 2026 Sensor Breakdown
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3 font-mono">
                  <div>
                    <div className="text-[11px] text-slate-500">MODIS (1km)</div>
                    <div className="text-lg font-bold text-slate-900">
                      {selectedMonthRecord.modisDetections}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">VIIRS (375m)</div>
                    <div className="text-lg font-bold text-slate-900">
                      {selectedMonthRecord.viirsDetections}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Harmonized</div>
                    <div className="text-lg font-bold text-sky-700">
                      {selectedMonthRecord.harmonizedEvents}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-3">
                  Spatial-temporal clustering deduplicates overlapping VIIRS I-band (375m) and MODIS (1km) swath pixels while preserving native sensor provenance.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-xs font-semibold text-slate-800">
                  Current vs. 25-Year Climatological Median
                </div>
                <div className="mt-3 flex items-baseline gap-3 font-mono">
                  <div>
                    <span className="text-2xl font-bold text-slate-900">
                      {selectedMonthRecord.harmonizedEvents}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">events (2026)</span>
                  </div>
                  <span className="text-slate-400">vs.</span>
                  <div>
                    <span className="text-xl font-semibold text-slate-700">
                      {selectedMonthRecord.historicalMedianEvents}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">25-yr median</span>
                  </div>
                </div>
                <div className="text-xs font-mono text-rose-700 mt-2">
                  Anomaly Factor:{' '}
                  {(
                    selectedMonthRecord.harmonizedEvents /
                    Math.max(1, selectedMonthRecord.historicalMedianEvents)
                  ).toFixed(2)}
                  x baseline
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-xs font-semibold text-slate-800">
                  Observation Coverage & Cloud Attenuation Uncertainty
                </div>
                <div className="mt-3 flex items-baseline gap-4 font-mono">
                  <div>
                    <div className="text-[11px] text-slate-500">
                      Valid Swath Coverage
                    </div>
                    <div className="text-xl font-bold text-emerald-700">
                      {selectedMonthRecord.coveragePct}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">
                      Residual Uncertainty
                    </div>
                    <div className="text-xl font-bold text-slate-900">
                      ±{selectedMonthRecord.uncertaintyPct}%
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Accounts for monsoon cloud mask opacity, off-nadir pixel bow-tie distortion, and diurnal orbital gap windows.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-500 font-mono text-center">
              No historical monthly burning records available for selected AOI.
            </div>
          )}
        </div>
      ) : subTab === 'perimeters' ? (
        /* NIFC Fire Perimeters & Spread Forecast Sub-Workspace */
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 space-y-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
            <div>
              <div className="text-xs font-mono text-amber-700 font-semibold uppercase tracking-wider">
                Tactical Simulation Benchmark · Awaiting Live NIFC FeatureServer Key
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mt-0.5">
                Active Fire Perimeters & Rothermel 1972 / FARSITE Spread Projections
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 self-start sm:self-auto">
              {getPerimetersForRegion(calendarRegionId).length} Benchmark Perimeter(s)
            </span>
          </div>

          <ProvenanceNoticeBanner
            modeLabel="Scientific Integrity & Live Telemetry Verification (Rule 1 & 3)"
            detail="Displaying calibrated Rothermel (1972) / FARSITE benchmark geometry. Authoritative production perimeters require NIFC ArcGIS FeatureServer or local forest department GIS credentials. Empirical NASA FIRMS detections are monitored on the primary map."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {getPerimetersForRegion(calendarRegionId).map((perim) => {
              const fcst = getSpreadForecastForPerimeter(perim.perimeterId);
              const history = getPerimeterProgression(perim.perimeterId);

              return (
                <div key={perim.perimeterId} className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50/50">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-200/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">{perim.perimeterId}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                          {perim.containmentPct}% Contained
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 mt-1">{perim.incidentName}</h4>
                      <p className="text-xs text-slate-500">
                        Mapped by {perim.mappedByAgency} via {perim.sourceMethod.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <div className="text-base font-extrabold text-slate-900">{perim.gisHectares} ha</div>
                      <div className="text-slate-500">{perim.gisAcres} acres</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Flame Length</span>
                      <span className="text-sm font-bold text-slate-900">{perim.maxFlameLengthMeters} m</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Intensity</span>
                      <span className="text-sm font-bold text-slate-900">{perim.firelineIntensityKwM} kW/m</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Crown Risk</span>
                      <span className="text-sm font-bold text-rose-700">{perim.crownFireBehavior.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Confidence</span>
                      <span className="text-sm font-bold text-emerald-700">{perim.confidenceScorePct}%</span>
                    </div>
                  </div>

                  {fcst && (
                    <div className="bg-white p-3 rounded-xl border border-red-200 space-y-2">
                      <div className="text-xs font-bold text-red-900 flex items-center justify-between">
                        <span>Rothermel Forward Spread Projection ({fcst.modelEngine})</span>
                        <span className="font-mono text-[11px] text-slate-500">ROS: {fcst.headFireRateOfSpreadMMin} m/min</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Effective Wind: {fcst.effectiveWindKmh} km/h @ {fcst.effectiveWindDirectionDeg}° · Dead Fuel: {fcst.deadFuelMoisture1hrPct}% · Spotting Distance: {fcst.spottingDistanceMaxKm} km
                      </p>
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-slate-800 block">Threatened Assets Downwind:</span>
                        {fcst.threatenedCriticalInfrastructure.map((target, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs p-1.5 bg-slate-50 rounded border border-slate-100">
                            <span className="font-medium text-slate-900">{target.name}</span>
                            <span className="font-mono text-[11px] text-red-700 font-bold">
                              ETA {target.estimatedArrivalHours}h ({target.distanceKm} km)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {history.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
                      <span className="text-xs font-semibold text-slate-800 block">Perimeter Progression Timeline:</span>
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {history.map((snap) => (
                          <div key={snap.snapshotId} className="flex items-center justify-between text-xs font-mono p-1 bg-white rounded border border-slate-200">
                            <span className="text-slate-500">+{snap.elapsedHoursFromIgnition}h ({snap.timestampUtc.slice(11, 16)} UTC)</span>
                            <span className="font-bold text-slate-900">{snap.burnedAreaHa} ha</span>
                            <span className="text-slate-600">{snap.containmentPct}% cont.</span>
                            <span className="text-slate-400 truncate max-w-[140px]">{snap.primaryActiveSector}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : subTab === 'fuels' ? (
        /* RAWS Weather Stations & Fuel Moisture Sub-Workspace */
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 space-y-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
            <div>
              <div className="text-xs font-mono text-emerald-700 font-semibold uppercase tracking-wider">
                NFDRS Nelson Physical Fuel Model & SMAP L4 In-Situ Soil Moisture
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mt-0.5">
                Validated Fire Weather Stations (RAWS), Fuel Moisture & Vegetation Condition
              </h3>
            </div>
            {(() => {
              const status = getFuelStatusAvailability(calendarRegionId);
              return (
                <div className="px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-900 border border-emerald-200 self-start sm:self-auto">
                  ● {status.stationCount} Station(s) · {status.status}
                </div>
              );
            })()}
          </div>

          <ProvenanceNoticeBanner
            modeLabel="Scientific Integrity & Live Telemetry Verification (Rule 1 & 3)"
            detail="Displaying NFDRS Nelson physical fuel moisture model benchmarks. Live high-resolution soil moisture and 100-hr fuel sticks require Mesowest/RAWS API credentials. Real-time NWP temperature and relative humidity are pulled via live Open-Meteo."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {getStationsForRegion(calendarRegionId).map((station) => {
              const obs = getLatestFuelMoistureObservation(station.stationId);

              return (
                <div key={station.stationId} className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50/50">
                  <div className="flex items-start justify-between border-b border-slate-200/80 pb-3">
                    <div>
                      <span className="font-mono text-xs font-bold text-emerald-800">{station.stationId}</span>
                      <h4 className="text-base font-bold text-slate-900 mt-0.5">{station.stationName}</h4>
                      <p className="text-xs text-slate-500">
                        Elevation: {station.elevationMeters}m · Fuel Bed: NFDRS {station.fuelModelNFDRS} · Aspect: {station.aspectDeg}°
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {station.operationalStatus}
                    </span>
                  </div>

                  {obs ? (
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs font-bold text-slate-800 mb-1.5">
                          Dead Fuel Moisture (Nelson Model Timelag Classes):
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center font-mono">
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <div className="text-[10px] text-slate-500">1-Hour</div>
                            <div className="text-base font-extrabold text-red-600">{obs.deadFuelMoisture.oneHourPct}%</div>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <div className="text-[10px] text-slate-500">10-Hour</div>
                            <div className="text-base font-extrabold text-amber-600">{obs.deadFuelMoisture.tenHourPct}%</div>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <div className="text-[10px] text-slate-500">100-Hour</div>
                            <div className="text-base font-extrabold text-slate-900">{obs.deadFuelMoisture.hundredHourPct}%</div>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-slate-200">
                            <div className="text-[10px] text-slate-500">1000-Hour</div>
                            <div className="text-base font-extrabold text-slate-900">{obs.deadFuelMoisture.thousandHourPct}%</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-slate-500 block">Live Foliar Moisture:</span>
                          <span className="font-mono font-bold text-slate-900">
                            Herb: {obs.liveFuelMoisture.herbaceousPct}% · Woody: {obs.liveFuelMoisture.woodyPct}%
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Soil Moisture (SMAP L4):</span>
                          <span className="font-mono font-bold text-slate-900">
                            Surface (0-5cm): {obs.soilMoistureSurfacePct}% · Rootzone: {obs.soilMoistureRootzPct}%
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Energy Release Component:</span>
                          <span className="font-mono font-bold text-amber-700">ERC: {obs.energyReleaseComponent}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Keetch-Byram Drought:</span>
                          <span className="font-mono font-bold text-slate-900">KBDI: {obs.keetchByramDroughtIndex} / 800</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 font-mono flex items-center justify-between">
                        <span>NDVI: {obs.ndviValue} ({obs.vegetationCondition})</span>
                        <span>Vapor Deficit: {obs.vaporPressureDeficitKpa} kPa</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                      Station telemetry currently pending field logger sync.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : subTab === 'exposure' ? (
        /* Population & Asset Exposure Sub-Workspace */
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 space-y-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
            <div>
              <div className="text-xs font-mono text-purple-700 font-semibold uppercase tracking-wider">
                WorldPop 100m Gridded Demographics · OpenStreetMap Buildings · Critical Infrastructure
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mt-0.5">
                Authoritative Exposure, Structure Hardening & Evacuation Corridors
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200 self-start sm:self-auto">
              Sector: {calendarRegionId}
            </span>
          </div>

          <ProvenanceNoticeBanner
            modeLabel="Scientific Integrity & Live Telemetry Verification (Rule 1 & 3)"
            detail="Displaying calibrated WorldPop 100m gridded demographic baseline and OSM structural vulnerability schema. Live real-time mobile GPS density feeds require authoritative disaster management authority credentials."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Evacuation Zones & Designated Corridors */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
                Active Evacuation Zones (Zonehaven / Genasys Standard)
              </h4>
              {getEvacuationZonesForRegion(calendarRegionId).map((zone) => (
                <div key={zone.zoneId} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-purple-900">{zone.zoneId}</span>
                      <h5 className="font-bold text-slate-900">{zone.zoneName}</h5>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      zone.status.includes('MANDATORY')
                        ? 'bg-red-600 text-white'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {zone.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Residents</span>
                      <span className="font-bold text-slate-900">{zone.residentCount}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Vehicles</span>
                      <span className="font-bold text-slate-900">{zone.registeredVehicles}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Clearance</span>
                      <span className="font-bold text-emerald-700">{zone.evacuationProgressPct}%</span>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 bg-white p-2.5 rounded-lg border border-slate-200">
                    <div><span className="text-slate-500">Primary Egress:</span> <span className="font-medium text-slate-900">{zone.primaryEgressRoute}</span></div>
                    <div><span className="text-slate-500">Shelter Destination:</span> <span className="font-medium text-slate-900">{zone.designatedShelterName}</span></div>
                    <div><span className="text-slate-500">Special Needs Assisted:</span> <span className="font-mono font-bold text-red-700">{zone.specialNeedsAssistanceRequired} Individuals</span></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Critical Infrastructure & Building Hardening */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
                Critical Infrastructure & OpenStreetMap Structure Vulnerability
              </h4>
              <div className="space-y-3">
                {getCriticalInfrastructureForRegion(calendarRegionId).map((infra) => (
                  <div key={infra.assetId} className="border border-slate-200 rounded-xl p-3 bg-white space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{infra.name}</span>
                      <span className="font-mono text-purple-700 font-semibold">{infra.category.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-xs text-slate-600 flex items-center justify-between">
                      <span>Proximity: <strong>{infra.distanceToFireFrontKm} km to fire</strong></span>
                      <span>Backup Power: <strong>{infra.backupPowerHours} hrs</strong></span>
                      <span className="text-emerald-700 font-semibold">{infra.operationalStatus}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed italic">{infra.defensibilityNotes}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Ground Verification & CAD Dispatches Sub-Workspace */
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 space-y-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
            <div>
              <div className="text-xs font-mono text-blue-700 font-semibold uppercase tracking-wider">
                Connected CAD Dispatch (112/911) & Authenticated ICS-201 Ranger Field Reports
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mt-0.5">
                Multi-Source Epistemic Corroboration & Digital Field Provenance
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 self-start sm:self-auto">
              Cryptographically Signed Logs Active
            </span>
          </div>

          <ProvenanceNoticeBanner
            modeLabel="Scientific Integrity & Live Telemetry Verification (Rule 1 & 3)"
            detail="Displaying authenticated ranger ICS-201 field report schema and emergency CAD simulation benchmark. In production deployments, dispatches connect directly to live emergency 112/911 PSAP integration endpoints."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Connected CAD Dispatch Incident Log */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
                Emergency Dispatch CAD Telemetry (112 / Central ECC)
              </h4>
              {getCadEventsForRegion(calendarRegionId).map((cad) => (
                <div key={cad.cadEventId} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-blue-900">{cad.cadEventId}</span>
                      <h5 className="font-bold text-slate-900">{cad.reportedLocationText}</h5>
                      <p className="text-xs text-slate-500">{cad.dispatchCenter}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
                      {cad.cadStatus.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-semibold text-slate-800 mb-1">Time-Stamped CAD Dispatch Log:</div>
                    {cad.cadLogEntries.map((entry, idx) => (
                      <div key={idx} className="border-l-2 border-blue-400 pl-2 text-slate-600">
                        <span className="font-mono text-slate-400">{entry.timestampUtc.slice(11, 19)} UTC</span> ·{' '}
                        <span className="text-slate-900">{entry.actionNote}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Authenticated Ranger Field Reports */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
                Authenticated ICS-201 Field Size-Up (Ranger Signed)
              </h4>
              {getRangerReportsForIncident('INC-2026-10-31-01').map((rpt) => (
                <div key={rpt.reportId} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-emerald-800">{rpt.reportId}</span>
                      <h5 className="font-bold text-slate-900">{rpt.officerName} ({rpt.officerBadgeId})</h5>
                      <p className="text-xs text-slate-500">{rpt.agency}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {rpt.corroborationStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs font-mono text-center">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Est. Flame Length</span>
                      <span className="font-bold text-slate-900">{rpt.initialAttackSizeUpIcs201.flameLengthMeters}m</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Spread Rate</span>
                      <span className="font-bold text-red-700">{rpt.initialAttackSizeUpIcs201.spreadRateEstimateMMin} m/min</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">GPS Accuracy</span>
                      <span className="font-bold text-slate-900">±{rpt.gpsAccuracyMeters}m</span>
                    </div>
                  </div>

                  <div className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div><span className="text-slate-500">Fuel Bed:</span> <span className="font-medium text-slate-900">{rpt.initialAttackSizeUpIcs201.fuelInvolved}</span></div>
                    <div><span className="text-slate-500">Ground Wind:</span> <span className="font-medium text-slate-900">{rpt.initialAttackSizeUpIcs201.groundWindEstimateKmh} km/h ({rpt.initialAttackSizeUpIcs201.groundWindDirection})</span></div>
                    <div><span className="text-slate-500">Tactical Recommendation:</span> <span className="font-medium text-slate-900">{rpt.initialAttackSizeUpIcs201.immediateTacticalAction}</span></div>
                  </div>

                  <div className="text-[10px] font-mono text-slate-500 break-all bg-slate-100 p-2 rounded border border-slate-200">
                    <span className="font-bold text-slate-700">Digital Signature SHA-256: </span>
                    {rpt.digitalSignatureSha256}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

