import React, { useEffect, useState } from 'react';
import {
  AgencyTask,
  IncidentRecord,
  NewsIntelligenceItem,
  ResourceAsset,
  RouteOption,
  WeatherStationSnapshot,
} from '../shared/types';
import { MonitoredRegion } from '../shared/dataAdapter';
import {
  formatSeverityLabel,
  formatVerificationLabel,
  ProvenanceNoticeBanner,
} from '../shared/ui';
import { EarthGlobe3D } from '../earth/EarthGlobe3D';
import { ScientificMap2D } from './ScientificMap2D';
import type { RawSatelliteObservation } from '../../server/adapters/nasaFirms';

interface CommandDashboardViewProps {
  incidents: IncidentRecord[];
  selectedIncidentId: string;
  onSelectIncident: (id: string) => void;
  selectedRegion: MonitoredRegion;
  onSelectRegion: (region: MonitoredRegion) => void;
  weather: WeatherStationSnapshot[];
  news: NewsIntelligenceItem[];
  routes: RouteOption[];
  resources: ResourceAsset[];
  agencyTasks: AgencyTask[];
  onNavigateTab: (tab: string) => void;
  onAcknowledgeAuthorityTask: (taskId: string) => void;
  onCreatePinnedIncident?: (newIncident: IncidentRecord, navigateToIntelligence?: boolean) => void;
}

export const CommandDashboardView: React.FC<CommandDashboardViewProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  selectedRegion,
  onSelectRegion,
  weather,
  news,
  routes,
  resources,
  agencyTasks,
  onNavigateTab,
  onAcknowledgeAuthorityTask,
  onCreatePinnedIncident,
}) => {
  const [spatialMode, setSpatialMode] = useState<'split' | 'map2d' | 'globe3d'>('map2d');
  const [isFullScreenGlobe, setIsFullScreenGlobe] = useState<boolean>(false);
  const [liveWeather, setLiveWeather] = useState<WeatherStationSnapshot[]>(weather);
  const [weatherFeedStatus, setWeatherFeedStatus] = useState<'loading' | 'live' | 'unavailable'>('loading');
  const [liveSatelliteObservations, setLiveSatelliteObservations] = useState<RawSatelliteObservation[]>([]);
  const [satelliteFeedStatus, setSatelliteFeedStatus] = useState<'loading' | 'live' | 'unavailable'>('loading');
  const [observationMode, setObservationMode] = useState<'live' | 'firelens'>('live');

  useEffect(() => {
    let cancelled = false;
    setSatelliteFeedStatus('loading');
    if (observationMode === 'firelens') {
      fetch('/api/observations?limit=2500').then(async (response) => {
        if (!response.ok) throw new Error('FireLens observations feed unavailable');
        return response.json();
      }).then((result) => {
        if (cancelled) return;
        setLiveSatelliteObservations(Array.isArray(result) ? result : []);
        setSatelliteFeedStatus('live');
      }).catch(() => {
        if (!cancelled) { setLiveSatelliteObservations([]); setSatelliteFeedStatus('unavailable'); }
      });
      return () => { cancelled = true; };
    }
    fetch(`/api/firms/live?regionId=${encodeURIComponent(selectedRegion.id)}`).then(async (response) => {
      if (!response.ok) throw new Error('NASA FIRMS feed unavailable');
      return response.json();
    }).then((result) => {
      if (cancelled) return;
      setLiveSatelliteObservations(result.isLive ? result.observations : []);
      setSatelliteFeedStatus(result.isLive ? 'live' : 'unavailable');
    }).catch(() => {
      if (!cancelled) { setLiveSatelliteObservations([]); setSatelliteFeedStatus('unavailable'); }
    });
    return () => { cancelled = true; };
  }, [selectedRegion.id, observationMode]);

  useEffect(() => {
    let cancelled = false;
    setWeatherFeedStatus('loading');
    const params = new URLSearchParams({ lat: String(selectedRegion.center.lat), lng: String(selectedRegion.center.lng), name: selectedRegion.name, stationId: `REGIONAL-${selectedRegion.id}` });
    fetch(`/api/weather?${params}`).then(async (response) => {
      if (!response.ok) throw new Error(`Weather feed HTTP ${response.status}`);
      return response.json();
    }).then((data) => {
      if (cancelled) return;
      setLiveWeather(Array.isArray(data) ? data : [data]);
      setWeatherFeedStatus('live');
    }).catch(() => {
      if (!cancelled) { setLiveWeather([]); setWeatherFeedStatus('unavailable'); }
    });
    return () => { cancelled = true; };
  }, [selectedRegion.id]);

  useEffect(() => {
    if (!isFullScreenGlobe) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullScreenGlobe(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreenGlobe]);

  useEffect(() => {
    const revealGlobe = () => {
      setIsFullScreenGlobe(false);
      setSpatialMode('globe3d');
      window.setTimeout(() => document.querySelector('[data-testid="r3f-tsl-earth-workspace"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    };
    window.addEventListener('alex:show-earth-globe', revealGlobe);
    return () => window.removeEventListener('alex:show-earth-globe', revealGlobe);
  }, []);

  const confirmedCount = incidents.filter(
    (i) =>
      i.status === 'authority_confirmed_emergency' || i.status === 'field_confirmed'
  ).length;
  const emergencyCount = incidents.filter(
    (i) => i.status === 'authority_confirmed_emergency'
  ).length;
  const corroboratedCount = incidents.filter(
    (i) => i.status === 'independently_corroborated' || i.status === 'candidate_incident'
  ).length;
  const unverifiedAnomalyCount = incidents.filter(
    (i) => i.status === 'satellite_thermal_anomaly'
  ).length;

  const frpValues = liveSatelliteObservations.map((o) => o.frpMw).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const peakFrp = frpValues.length ? Math.max(...frpValues) : null;

  const primaryWeather = liveWeather.length > 0 ? liveWeather[0] : null;
  const pendingTasks = agencyTasks.filter((t) => t.status !== 'Completed');

  return (
    <div className="space-y-5 sm:space-y-6">
      <ProvenanceNoticeBanner
        modeLabel="Live-data-first scientific workspace"
        detail="NASA FIRMS observations and NASA EONET events are displayed only with their source-native status. When a feed is unavailable, the application shows an explicit unavailable state rather than simulated telemetry."
      />

      {/* Operational Greeting & Executive Summary Strip */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-4 sm:pb-5 border-b border-slate-200/80">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mb-1.5">
              <span className="font-mono text-emerald-700 font-semibold whitespace-nowrap">
                ● System Nominal
              </span>
              <span aria-hidden="true">·</span>
              <span className="truncate">Active Sector: {selectedRegion.name}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono whitespace-nowrap">T+05:02:37 UTC</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 leading-tight">
              Operational Environmental Command & Harmonized Sensor Overview
            </h1>
          </div>

          {/* Spatial View Switcher — Toggle between 2D Operational View and 3D Scientific Globe */}
          <div className="w-full lg:w-auto shrink-0">
            <div
              role="group"
              aria-label="Spatial View Mode Switcher"
              className="grid grid-cols-3 sm:inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto"
            >
              <button
                type="button"
                onClick={() => setSpatialMode('split')}
                className={`px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-medium rounded-lg text-center whitespace-nowrap transition-colors ${
                  spatialMode === 'split'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Research Split
              </button>
              <button
                type="button"
                onClick={() => setSpatialMode('map2d')}
                className={`px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-medium rounded-lg text-center whitespace-nowrap transition-colors ${
                  spatialMode === 'map2d'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Operations Map
              </button>
              <button
                type="button"
                onClick={() => setSpatialMode('globe3d')}
                className={`px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-medium rounded-lg text-center whitespace-nowrap transition-colors ${
                  spatialMode === 'globe3d'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Research Globe
              </button>
            </div>
          </div>
        </div>

        {/* 2x2 Mobile / 4-Column Desktop Scientific Metric Readout Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-4 sm:pt-5">
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
              Verified & Field Confirmed
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 tabular-nums">
                {confirmedCount}
              </span>
              <span className="text-[11px] font-mono text-rose-700 whitespace-nowrap">
                ◆ {emergencyCount} {emergencyCount === 1 ? 'Emergency' : 'Emergencies'}
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-snug">
              {corroboratedCount} corroborated · {unverifiedAnomalyCount} unverified
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-1">
              <div className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
                Peak NASA FIRMS FRP
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded text-[10px]">
                <button
                  type="button"
                  onClick={() => setObservationMode('live')}
                  className={`px-1.5 py-0.5 rounded font-mono transition-colors ${observationMode === 'live' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Query live 24h NRT satellite passes"
                >
                  NRT
                </button>
                <button
                  type="button"
                  onClick={() => setObservationMode('firelens')}
                  className={`px-1.5 py-0.5 rounded font-mono transition-colors ${observationMode === 'firelens' ? 'bg-white text-sky-700 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Load 13,065 canonical research observations (Nilgiris 2019-2026)"
                >
                  Archive (13k)
                </button>
              </div>
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 tabular-nums">
                {peakFrp === null ? '—' : peakFrp.toFixed(1)}
              </span>
              <span className="text-xs font-mono uppercase text-slate-400">MW</span>
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-snug">
              {satelliteFeedStatus === 'live'
                ? `${observationMode === 'firelens' ? 'FireLens 2019-2026 Archive' : 'NASA FIRMS live'} · ${liveSatelliteObservations.length} detections · ${frpValues.length} with FRP`
                : satelliteFeedStatus === 'loading'
                ? 'Loading satellite feed…'
                : 'Live satellite feed unavailable · no synthetic value'}
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
              Ridge Wind & Dryness
            </div>
            {primaryWeather ? (
              <>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 tabular-nums">
                    {primaryWeather.windSpeedKmh}
                  </span>
                  <span className="text-[11px] font-mono uppercase text-slate-400">
                    km/h {primaryWeather.windCompass}
                  </span>
                  <span className="text-[11px] font-mono text-orange-700 whitespace-nowrap">
                    Gusts {Number.isFinite(primaryWeather.windGustKmh) ? primaryWeather.windGustKmh : '—'}
                  </span>
                </div>
                <div className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-snug">
                  RH {Number.isFinite(primaryWeather.humidityPct) ? `${primaryWeather.humidityPct}%` : '—'} · Fuel dryness {Number.isFinite(primaryWeather.fuelDrynessPct) ? `${primaryWeather.fuelDrynessPct}%` : 'unavailable'}
                </div>
              </>
            ) : (
              <>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <span className="text-xl sm:text-2xl font-mono font-medium text-slate-400 tabular-nums">
                    —
                  </span>
                </div>
                <div className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-snug">
                  {weatherFeedStatus === 'loading' ? 'Loading live Open-Meteo weather…' : 'Live weather unavailable'}
                </div>
              </>
            )}
          </div>

          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
              Readiness & Sign-Offs
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 tabular-nums">
                {pendingTasks.length}
              </span>
              <span className="text-[11px] font-mono text-sky-700 whitespace-nowrap">
                Pending Actions
              </span>
            </div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-snug">
              {resources.filter((r) => r.operationalStatus === 'Available').length} units ready
            </div>
          </div>
        </div>
      </div>

      {/* 3D Earth Visualization */}
      {(isFullScreenGlobe || spatialMode === 'split' || spatialMode === 'globe3d') && (
        <EarthGlobe3D
          incidents={incidents}
          selectedRegion={selectedRegion}
          onSelectRegion={onSelectRegion}
          onSelectIncident={onSelectIncident}
          onSwitchTo2DMap={() => {
            setIsFullScreenGlobe(false);
            setSpatialMode('map2d');
          }}
          onCreatePinnedIncident={(newIncident, navigateToIntelligence) => {
            if (navigateToIntelligence) {
              setIsFullScreenGlobe(false);
            }
            onCreatePinnedIncident?.(newIncident, navigateToIntelligence);
          }}
          isFullScreen={isFullScreenGlobe}
          onToggleFullScreen={() => setIsFullScreenGlobe((v) => !v)}
        />
      )}

      {/* Floating Toggle Button — Switches between default dashboard interface and full-screen R3F 3D globe */}
      <div className="fixed bottom-16 lg:bottom-5 left-3 sm:left-4 z-[60]">
        <button
          type="button"
          data-testid="floating-fullscreen-globe-toggle"
          onClick={() => setIsFullScreenGlobe((prev) => !prev)}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-[0_12px_32px_rgba(15,23,42,0.22)] border text-xs font-medium transition-all ${
            isFullScreenGlobe
              ? 'bg-emerald-500 text-slate-950 border-emerald-300 hover:bg-emerald-400 font-semibold'
              : 'bg-slate-950/95 text-white border-slate-700/80 hover:bg-slate-900 backdrop-blur-md'
          }`}
          title={
            isFullScreenGlobe
              ? 'Return to Default Operational Dashboard (Esc)'
              : 'Switch to Full-Screen React Three Fiber 3D Globe Visualization'
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isFullScreenGlobe ? 'bg-slate-950 animate-ping' : 'bg-sky-400 animate-pulse'
            }`}
          />
          <span>
            {isFullScreenGlobe ? 'Exit Full-Screen 3D Globe' : 'Full-Screen 3D Globe'}
          </span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              isFullScreenGlobe
                ? 'bg-slate-950/20 text-slate-950'
                : 'bg-slate-800 text-sky-300 border border-slate-700'
            }`}
          >
            {isFullScreenGlobe ? 'ESC' : 'R3F 3D'}
          </span>
        </button>
      </div>

      {/* 2D Interactive Geospatial Intelligence Workspace */}
      {(spatialMode === 'split' || spatialMode === 'map2d') && (
        <ScientificMap2D selectedRegion={selectedRegion} />
      )}

      {/* Lower 3-Column Operational Intelligence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Column 1: Active Incidents by Epistemic Verification Tier */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Monitored Detections & Verification Ledger
              </h2>
              <p className="text-xs text-slate-500">
                Raw thermal anomalies separated from confirmed emergencies
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('incidents')}
              className="min-h-[36px] px-2.5 text-xs font-medium text-sky-700 hover:text-sky-900 whitespace-nowrap shrink-0"
            >
              Inspect All →
            </button>
          </div>

          <div className="divide-y divide-slate-200/70 mt-2">
            {incidents.map((inc) => {
              const ver = formatVerificationLabel(inc.status);
              const sev = formatSeverityLabel(inc.severity);
              const isSelected = inc.id === selectedIncidentId;

              return (
                <div
                  key={inc.id}
                  className={`py-3.5 transition-colors ${
                    isSelected ? 'bg-sky-50/60 -mx-2 px-2 rounded-xl' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 min-w-0">
                      <span className="font-mono font-semibold text-slate-800 shrink-0">
                        {inc.id}
                      </span>
                      <span>·</span>
                      <span className={`font-medium truncate ${ver.toneClass}`}>
                        {ver.glyph} {ver.shortLabel}
                      </span>
                    </div>
                    <span className={`font-mono text-[11px] shrink-0 ${sev.toneClass}`}>
                      {sev.glyph} {sev.label}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectIncident(inc.id)}
                    className="text-left w-full mt-1 group"
                  >
                    <div className="text-sm font-semibold text-slate-900 group-hover:text-sky-700 transition-colors">
                      {inc.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 font-mono">
                      FRP {inc.harmonizedFrpMw} MW · ±{inc.uncertaintyRadiusMeters}m · VIIRS ({inc.viirsCount}) / MODIS ({inc.modisCount})
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Pending Authority Acknowledgements & Multi-Agency Actions */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Authority Sign-Off & Action Queue
              </h2>
              <p className="text-xs text-slate-500">
                Requires human dispatcher approval
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('routing')}
              className="min-h-[36px] px-2.5 text-xs font-medium text-sky-700 hover:text-sky-900 whitespace-nowrap shrink-0"
            >
              Coordination →
            </button>
          </div>

          <div className="divide-y divide-slate-200/70 mt-2">
            {agencyTasks.map((task) => (
              <div key={task.id} className="py-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium text-slate-800">{task.agency}</span>
                  <span className="font-mono">{task.timestamp}</span>
                </div>
                <p className="text-xs font-medium text-slate-900 mt-1 leading-snug">
                  {task.title}
                </p>
                <div className="flex items-center justify-between gap-2 mt-2.5">
                  <span className="text-[11px] font-mono text-slate-500">
                    Status: {task.status}
                  </span>
                  {task.status !== 'Completed' && (
                    <button
                      type="button"
                      onClick={() => onAcknowledgeAuthorityTask(task.id)}
                      className="min-h-[34px] px-3 py-1.5 text-[11px] font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 whitespace-nowrap shrink-0"
                    >
                      Acknowledge & Advance
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Chronological System & Intelligence Feed */}
        <div className="lg:col-span-3 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Live Activity Timeline
              </h2>
              <p className="text-xs text-slate-500">
                Sensor passes, weather shifts & alerts
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('news')}
              className="min-h-[36px] px-2.5 text-xs font-medium text-sky-700 hover:text-sky-900 whitespace-nowrap shrink-0"
            >
              Full Feed →
            </button>
          </div>

          <div className="divide-y divide-slate-200/70 mt-2">
            {news.map((item) => (
              <div key={item.id} className="py-3">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                  <span>{item.publishedAt.slice(11, 16)} UTC</span>
                  <span>·</span>
                  <span className="truncate">{item.category}</span>
                </div>
                <div className="text-xs font-medium text-slate-900 mt-1 leading-snug">
                  {item.title}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Credibility {item.credibilityScore}% · {item.sourceType}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
