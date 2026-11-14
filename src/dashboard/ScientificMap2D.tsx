import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { RawSatelliteObservation } from '../../server/adapters/nasaFirms';
import type { NasaEonetWildfire } from '../../server/adapters/nasaEonet';
import { MonitoredRegion } from '../shared/dataAdapter';
import { apiClient } from '../shared/apiClient';
import {
  FirePerimeterRecord,
  getPerimetersForRegion,
  getSpreadForecastForPerimeter,
} from '../shared/firePerimeterData';
import {
  FuelMoistureStation,
  getLatestFuelMoistureObservation,
  getStationsForRegion,
} from '../shared/fuelMoistureData';
import {
  CriticalInfrastructureAsset,
  EvacuationZone,
  getCriticalInfrastructureForRegion,
  getEvacuationZonesForRegion,
} from '../shared/exposureData';
import {
  LiveResponderApparatus,
  RoadHazardSegment,
  getFleetForRegion,
  getRoadHazardsForRegion,
} from '../shared/roadHazardsAndResourcesData';
import {
  AuthenticatedRangerReport,
  CadDispatchEvent,
  getCadEventsForRegion,
  getRangerReportsForIncident,
} from '../shared/groundVerificationData';

type LngLat = { lng: number; lat: number };
const TILE = 256;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const worldSize = (zoom: number) => TILE * 2 ** zoom;
const toWorld = ({ lng, lat }: LngLat, zoom: number) => {
  const size = worldSize(zoom);
  const x = ((lng + 180) / 360) * size;
  const boundedLat = clamp(lat, -85.05112878, 85.05112878) * Math.PI / 180;
  const y = (1 - Math.asinh(Math.tan(boundedLat)) / Math.PI) / 2 * size;
  return { x, y };
};
const fromWorld = ({ x, y }: { x: number; y: number }, zoom: number): LngLat => {
  const size = worldSize(zoom);
  const lng = x / size * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y / size;
  return { lng, lat: 180 / Math.PI * Math.atan(Math.sinh(n)) };
};
const fmtTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? 'Unknown time' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC';
};

type SelectedEntity =
  | { kind: 'firms'; item: RawSatelliteObservation }
  | { kind: 'eonet'; item: NasaEonetWildfire }
  | { kind: 'perimeter'; item: FirePerimeterRecord }
  | { kind: 'station'; item: FuelMoistureStation }
  | { kind: 'infrastructure'; item: CriticalInfrastructureAsset }
  | { kind: 'evacuation'; item: EvacuationZone }
  | { kind: 'hazard'; item: RoadHazardSegment }
  | { kind: 'apparatus'; item: LiveResponderApparatus }
  | { kind: 'cad'; item: CadDispatchEvent }
  | { kind: 'ranger'; item: AuthenticatedRangerReport };

export const ScientificMap2D: React.FC<{ selectedRegion: MonitoredRegion }> = ({ selectedRegion }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; center: LngLat } | null>(null);
  const [center, setCenter] = useState<LngLat>(selectedRegion.center);
  const [zoom, setZoom] = useState(clamp(selectedRegion.zoom, 3, 12));
  const [size, setSize] = useState({ width: 900, height: 520 });
  const [observations, setObservations] = useState<RawSatelliteObservation[]>([]);
  const [events, setEvents] = useState<NasaEonetWildfire[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [satelliteFeedStatus, setSatelliteFeedStatus] = useState<'loading' | 'live' | 'unavailable'>('loading');

  // Layer Toggles
  const [showFirms, setShowFirms] = useState(true);
  const [showEonet, setShowEonet] = useState(true);
  const [showPerimeters, setShowPerimeters] = useState(true);
  const [showFuels, setShowFuels] = useState(true);
  const [showExposure, setShowExposure] = useState(true);
  const [showHazardsFleet, setShowHazardsFleet] = useState(true);
  const [showGroundCad, setShowGroundCad] = useState(true);

  const [selected, setSelected] = useState<SelectedEntity | null>(null);

  useEffect(() => {
    setCenter(selectedRegion.center);
    setZoom(clamp(selectedRegion.zoom, 3, 12));
  }, [selectedRegion.id]);

  useEffect(() => {
    const node = mapRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const refresh = async () => {
    setLoadError(null);
    setSatelliteFeedStatus('loading');
    const [live, raw, eonet] = await Promise.allSettled([apiClient.getLiveFirmsObservations(selectedRegion.id), apiClient.getRawObservations(), apiClient.getEonetWildfires()]);
    if (live.status === 'fulfilled' && live.value.isLive) {
      setObservations(live.value.observations);
      setSatelliteFeedStatus('live');
    } else if (raw.status === 'fulfilled') {
      setObservations(raw.value);
      setSatelliteFeedStatus('unavailable');
    } else setSatelliteFeedStatus('unavailable');
    if (eonet.status === 'fulfilled') setEvents(eonet.value.events);
    const reasons = [live, raw, eonet].filter((result): result is PromiseRejectedResult => result.status === 'rejected').map((result) => result.reason?.message || 'Data request failed');
    if (reasons.length) setLoadError(reasons.join(' · '));
  };
  useEffect(() => { void refresh(); }, [selectedRegion.id]);

  const centerWorld = toWorld(center, zoom);
  const topLeft = { x: centerWorld.x - size.width / 2, y: centerWorld.y - size.height / 2 };
  const tiles = useMemo(() => {
    const n = 2 ** zoom;
    const startX = Math.floor(topLeft.x / TILE);
    const startY = Math.floor(topLeft.y / TILE);
    const endX = Math.floor((topLeft.x + size.width) / TILE);
    const endY = Math.floor((topLeft.y + size.height) / TILE);
    const items: { x: number; y: number; tileX: number; tileY: number }[] = [];
    for (let y = startY; y <= endY; y++) for (let x = startX; x <= endX; x++) {
      if (y >= 0 && y < n) items.push({ x: x * TILE - topLeft.x, y: y * TILE - topLeft.y, tileX: ((x % n) + n) % n, tileY: y });
    }
    return items;
  }, [zoom, topLeft.x, topLeft.y, size.width, size.height]);

  const screenPoint = (point: LngLat) => {
    const world = toWorld(point, zoom);
    const dx = ((world.x - centerWorld.x + worldSize(zoom) / 2) % worldSize(zoom)) - worldSize(zoom) / 2;
    return { x: dx + size.width / 2, y: world.y - centerWorld.y + size.height / 2 };
  };
  const inView = ({ x, y }: { x: number; y: number }) => x > -60 && x < size.width + 60 && y > -60 && y < size.height + 60;

  // Real-time & Mock Data queries for the current region
  const regionalPerimeters = useMemo(() => getPerimetersForRegion(selectedRegion.id), [selectedRegion.id]);
  const regionalStations = useMemo(() => getStationsForRegion(selectedRegion.id), [selectedRegion.id]);
  const regionalInfrastructure = useMemo(() => getCriticalInfrastructureForRegion(selectedRegion.id), [selectedRegion.id]);
  const regionalEvacZones = useMemo(() => getEvacuationZonesForRegion(selectedRegion.id), [selectedRegion.id]);
  const regionalHazards = useMemo(() => getRoadHazardsForRegion(selectedRegion.id), [selectedRegion.id]);
  const regionalFleet = useMemo(() => getFleetForRegion(selectedRegion.id), [selectedRegion.id]);
  const regionalCadEvents = useMemo(() => getCadEventsForRegion(selectedRegion.id), [selectedRegion.id]);
  const regionalRangerReports = useMemo(() => getRangerReportsForIncident('INC-2026-10-31-01'), []);

  const firmsPoints = observations.map((item) => ({ item, point: screenPoint({ lat: item.lat, lng: item.lng }) })).filter(({ point }) => inView(point));
  const eonetPoints = events.map((item) => ({ item, point: screenPoint({ lat: item.coordinates[0]?.[1], lng: item.coordinates[0]?.[0] }) })).filter(({ point }) => inView(point));

  const moveFrom = (origin: LngLat, dx: number, dy: number) => {
    const originWorld = toWorld(origin, zoom);
    const next = fromWorld({ x: originWorld.x - dx, y: originWorld.y - dy }, zoom);
    setCenter({ lat: clamp(next.lat, -85, 85), lng: ((next.lng + 540) % 360) - 180 });
  };
  const zoomAtCenter = (delta: number) => setZoom((current) => clamp(current + delta, 2, 16));

  return (
    <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <header className="px-4 py-3 border-b border-slate-200 flex flex-col gap-2.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">2D Scientific Multi-Layer Map</h2>
            <p className="text-xs text-slate-600">
              OSM basemap + live NASA FIRMS / EONET · SIM = illustrative fuel, exposure, road, fleet & CAD layers (not field telemetry)
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="self-start md:self-auto px-3 py-1.5 text-xs font-medium rounded-lg bg-sky-700 text-white hover:bg-sky-800 transition-colors shadow-2xs"
          >
            Refresh Satellite Feeds
          </button>
        </div>

        {/* Scientific Layer Toggles Bar */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowFirms((v) => !v)}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-colors ${
              showFirms ? 'border-orange-500 bg-orange-50 text-orange-950 font-semibold shadow-2xs' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            ● FIRMS {satelliteFeedStatus === 'live' ? 'LIVE' : satelliteFeedStatus === 'loading' ? '…' : 'CACHED'} ({observations.length})
          </button>
          <button
            type="button"
            onClick={() => setShowEonet((v) => !v)}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-colors ${
              showEonet ? 'border-rose-500 bg-rose-50 text-rose-950 font-semibold shadow-2xs' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            ◆ EONET ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setShowPerimeters((v) => !v)}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-colors ${
              showPerimeters ? 'border-red-600 bg-red-50 text-red-950 font-semibold shadow-2xs' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            ⬡ Perimeters · SIM ({regionalPerimeters.length})
          </button>
          <button
            type="button"
            onClick={() => setShowFuels((v) => !v)}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-colors ${
              showFuels ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold shadow-2xs' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            ▲ Fuel Model · SIM ({regionalStations.length})
          </button>
          <button
            type="button"
            onClick={() => setShowExposure((v) => !v)}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-colors ${
              showExposure ? 'border-purple-600 bg-purple-50 text-purple-950 font-semibold shadow-2xs' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            ■ Exposure · SIM ({regionalInfrastructure.length + regionalEvacZones.length})
          </button>
          <button
            type="button"
            onClick={() => setShowHazardsFleet((v) => !v)}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-colors ${
              showHazardsFleet ? 'border-amber-600 bg-amber-50 text-amber-950 font-semibold shadow-2xs' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            ⛔ Roads & Fleet · SIM ({regionalHazards.length + regionalFleet.length})
          </button>
          <button
            type="button"
            onClick={() => setShowGroundCad((v) => !v)}
            className={`px-2.5 py-1 rounded-lg border font-medium transition-colors ${
              showGroundCad ? 'border-blue-600 bg-blue-50 text-blue-950 font-semibold shadow-2xs' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            ★ CAD & Ranger · SIM ({regionalCadEvents.length + regionalRangerReports.length})
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Interactive Map Canvas Container */}
        <div
          ref={mapRef}
          className="relative h-[480px] sm:h-[600px] overflow-hidden bg-slate-200 touch-none select-none cursor-grab active:cursor-grabbing"
          onPointerDown={(event) => {
            (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
            dragRef.current = { x: event.clientX, y: event.clientY, center };
          }}
          onPointerMove={(event) => {
            if (!dragRef.current) return;
            moveFrom(dragRef.current.center, event.clientX - dragRef.current.x, event.clientY - dragRef.current.y);
          }}
          onPointerUp={() => { dragRef.current = null; }}
          onWheel={(event) => { event.preventDefault(); zoomAtCenter(event.deltaY < 0 ? 1 : -1); }}
        >
          {/* Tile Layer */}
          {tiles.map((tile) => (
            <img
              key={`${zoom}/${tile.tileX}/${tile.tileY}`}
              draggable={false}
              alt=""
              className="absolute max-w-none"
              style={{ left: tile.x, top: tile.y, width: TILE, height: TILE }}
              src={`https://tile.openstreetmap.org/${zoom}/${tile.tileX}/${tile.tileY}.png`}
            />
          ))}

          {/* SVG Vector Overlays Layer (Perimeter Polygons, Spread Isochrones, Road Hazard Lines) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-[3]">
            {/* 1. Fire Perimeters */}
            {showPerimeters && regionalPerimeters.map((perim) => {
              const pts = perim.polygonCoordinates.map(([lng, lat]) => screenPoint({ lat, lng }));
              const ptsStr = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
              const fcst = getSpreadForecastForPerimeter(perim.perimeterId);

              return (
                <g key={perim.perimeterId}>
                  {/* Projected 6H Isochrone if available */}
                  {fcst?.isochrones[1] && (
                    <polygon
                      points={fcst.isochrones[1].polygon.map(([lng, lat]) => {
                        const p = screenPoint({ lat, lng });
                        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                      }).join(' ')}
                      fill="#ef4444"
                      fillOpacity="0.12"
                      stroke="#ef4444"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                  )}
                  {/* Primary Active Perimeter Boundary */}
                  <polygon
                    points={ptsStr}
                    fill="#dc2626"
                    fillOpacity="0.28"
                    stroke="#b91c1c"
                    strokeWidth="2.5"
                    className="pointer-events-auto cursor-pointer hover:fill-opacity-40 transition-all"
                    onClick={() => setSelected({ kind: 'perimeter', item: perim })}
                  />
                </g>
              );
            })}

            {/* 2. Road Hazard Closed Segments */}
            {showHazardsFleet && regionalHazards.map((haz) => {
              const p1 = screenPoint(haz.startCoordinates);
              const p2 = screenPoint(haz.endCoordinates);
              return (
                <g key={haz.hazardId}>
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="#dc2626"
                    strokeWidth="4"
                    strokeDasharray="6 4"
                    className="pointer-events-auto cursor-pointer"
                    onClick={() => setSelected({ kind: 'hazard', item: haz })}
                  />
                </g>
              );
            })}
          </svg>

          {/* Map Navigation Controls */}
          <div className="absolute top-3 left-3 z-10 flex flex-col shadow-sm rounded-lg overflow-hidden">
            <button type="button" aria-label="Zoom in" onClick={() => zoomAtCenter(1)} className="w-8 h-8 bg-white border border-slate-300 text-lg hover:bg-slate-50 font-bold">+</button>
            <button type="button" aria-label="Zoom out" onClick={() => zoomAtCenter(-1)} className="w-8 h-8 bg-white border-x border-b border-slate-300 text-lg hover:bg-slate-50 font-bold">−</button>
            <button type="button" aria-label="Reset map to selected area" onClick={() => { setCenter(selectedRegion.center); setZoom(clamp(selectedRegion.zoom, 3, 12)); }} className="w-8 h-8 bg-white border-x border-b border-slate-300 text-xs hover:bg-slate-50">⌂</button>
          </div>

          {/* Interactive Marker Overlays */}
          {/* FIRMS Satellite Thermal Observations */}
          {showFirms && firmsPoints.map(({ item, point }) => (
            <button
              key={item.id}
              type="button"
              title={`NASA FIRMS ${item.sensor} observation (${item.frpMw ?? 'N/A'} MW)`}
              onClick={() => setSelected({ kind: 'firms', item })}
              className="absolute z-[4] -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white bg-orange-600 shadow-md hover:scale-125 transition-transform"
              style={{ left: point.x, top: point.y }}
            />
          ))}

          {/* NASA EONET Wildfire Events */}
          {showEonet && eonetPoints.map(({ item, point }) => (
            <button
              key={item.id}
              type="button"
              title={item.title}
              onClick={() => setSelected({ kind: 'eonet', item })}
              className="absolute z-[4] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rotate-45 border-2 border-white bg-rose-700 shadow-md hover:scale-125 transition-transform"
              style={{ left: point.x, top: point.y }}
            />
          ))}

          {/* RAWS Fuel Weather Stations */}
          {showFuels && regionalStations.map((stn) => {
            const pt = screenPoint(stn.coordinates);
            if (!inView(pt)) return null;
            return (
              <button
                key={stn.stationId}
                type="button"
                title={`${stn.stationName} (RAWS)`}
                onClick={() => setSelected({ kind: 'station', item: stn })}
                className="absolute z-[5] -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md bg-emerald-800 text-white font-mono text-[9px] font-bold border border-emerald-400 shadow-sm hover:scale-110 flex items-center gap-1"
                style={{ left: pt.x, top: pt.y }}
              >
                <span>▲</span>
                <span>{stn.stationId.replace('RAWS-', '')}</span>
              </button>
            );
          })}

          {/* Critical Infrastructure Assets */}
          {showExposure && regionalInfrastructure.map((infra) => {
            const pt = screenPoint(infra.coordinates);
            if (!inView(pt)) return null;
            const glyph = infra.category.includes('HOSPITAL') ? '🏥' : infra.category.includes('POWER') ? '⚡' : infra.category.includes('WATER') ? '💧' : '📡';
            return (
              <button
                key={infra.assetId}
                type="button"
                title={infra.name}
                onClick={() => setSelected({ kind: 'infrastructure', item: infra })}
                className="absolute z-[5] -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-purple-600 shadow-sm flex items-center justify-center text-xs hover:scale-125 transition-transform"
                style={{ left: pt.x, top: pt.y }}
              >
                {glyph}
              </button>
            );
          })}

          {/* Road Hazard Warning Badges */}
          {showHazardsFleet && regionalHazards.map((haz) => {
            const pt = screenPoint(haz.startCoordinates);
            if (!inView(pt)) return null;
            return (
              <button
                key={`badge-${haz.hazardId}`}
                type="button"
                title={`Closure: ${haz.roadName}`}
                onClick={() => setSelected({ kind: 'hazard', item: haz })}
                className="absolute z-[6] -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-[10px] border border-white shadow-md hover:scale-125"
                style={{ left: pt.x, top: pt.y }}
              >
                ⛔
              </button>
            );
          })}

          {/* Live Responder Apparatus Fleet */}
          {showHazardsFleet && regionalFleet.map((fleet) => {
            const pt = screenPoint(fleet.telemetry);
            if (!inView(pt)) return null;
            return (
              <button
                key={fleet.apparatusId}
                type="button"
                title={`${fleet.callsign} (${fleet.cadStatus})`}
                onClick={() => setSelected({ kind: 'apparatus', item: fleet })}
                className="absolute z-[6] -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-900 border-2 border-white shadow-md font-bold text-[9px] hover:scale-115 flex items-center gap-0.5 whitespace-nowrap"
                style={{ left: pt.x, top: pt.y }}
              >
                <span>🚒</span>
                <span>{fleet.waterRemainingPct}%</span>
              </button>
            );
          })}

          {/* CAD Dispatch & Ranger Ground Observations */}
          {showGroundCad && regionalCadEvents.map((cad) => {
            const pt = screenPoint(cad.coordinates);
            if (!inView(pt)) return null;
            return (
              <button
                key={cad.cadEventId}
                type="button"
                title={`CAD Event ${cad.cadEventId}`}
                onClick={() => setSelected({ kind: 'cad', item: cad })}
                className="absolute z-[7] -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-md bg-blue-700 text-white flex items-center justify-center font-bold text-[10px] border-2 border-white shadow-md hover:scale-125"
                style={{ left: pt.x, top: pt.y }}
              >
                ★
              </button>
            );
          })}

          <div className="absolute bottom-1 right-1 bg-white/85 px-1.5 py-0.5 text-[10px] text-slate-600 rounded">
            © OpenStreetMap contributors · NIFC WFIGS · RAWS
          </div>
        </div>

        {/* Aside Entity Inspector & Scientific Explanation Panel */}
        <aside className="border-t lg:border-l lg:border-t-0 border-slate-200 p-4 text-xs text-slate-700 overflow-y-auto max-h-[600px] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-mono text-[11px] text-slate-500">{center.lat.toFixed(4)}°, {center.lng.toFixed(4)}° · z{zoom}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-800 bg-sky-50 px-2 py-0.5 rounded">
              {selectedRegion.name}
            </span>
          </div>

          {loadError && (
            <p className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-amber-900 text-[11px]">
              Live satellite feed notice: {loadError}. Local scientific layers operational.
            </p>
          )}

          {/* Detailed Inspector Views for Selected Entities */}
          {selected?.kind === 'firms' ? (
            <div className="space-y-1.5 bg-orange-50/50 p-3 rounded-xl border border-orange-200">
              <div className="text-[10px] font-mono font-bold uppercase text-orange-800">NASA FIRMS Thermal Anomaly</div>
              <h3 className="font-semibold text-slate-900 text-sm">{selected.item.sensor} · {selected.item.satellite}</h3>
              <p className="text-slate-600">{selected.item.lat.toFixed(5)}°N, {selected.item.lng.toFixed(5)}°E</p>
              <p className="text-slate-600">Acquired: {fmtTime(selected.item.acquisitionTimestampUtc)}</p>
              <p className="font-semibold text-slate-900">FRP: {selected.item.frpMw === null ? 'Uncalibrated' : `${selected.item.frpMw} MW`}</p>
              <p className="text-slate-600">Confidence: {selected.item.modisConfidencePct ?? selected.item.viirsConfidenceCategory ?? 'N/A'}</p>
              <p className="text-[11px] text-slate-500 italic mt-2">
                Point thermal anomaly only. Does NOT establish ground fire perimeter.
              </p>
            </div>
          ) : selected?.kind === 'eonet' ? (
            <div className="space-y-1.5 bg-rose-50/50 p-3 rounded-xl border border-rose-200">
              <div className="text-[10px] font-mono font-bold uppercase text-rose-800">NASA EONET Event Record</div>
              <h3 className="font-semibold text-slate-900 text-sm">{selected.item.title}</h3>
              <p className="text-slate-600">Updated: {fmtTime(selected.item.updated)}</p>
              <p className="text-slate-600">Geometry: {selected.item.geometryType}</p>
              {selected.item.sourceUrl && (
                <a className="text-sky-700 underline block text-xs" href={selected.item.sourceUrl} target="_blank" rel="noreferrer">
                  External Agency Source ↗
                </a>
              )}
            </div>
          ) : selected?.kind === 'perimeter' ? (
            <div className="space-y-2 bg-red-50/50 p-3 rounded-xl border border-red-200">
              <div className="text-[10px] font-mono font-bold uppercase text-red-800">NIFC WFIGS Verified Perimeter</div>
              <h3 className="font-semibold text-slate-900 text-sm">{selected.item.incidentName}</h3>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-500">GIS Area:</span>
                  <div className="font-bold text-slate-900">{selected.item.gisHectares} ha ({selected.item.gisAcres} ac)</div>
                </div>
                <div>
                  <span className="text-slate-500">Containment:</span>
                  <div className="font-bold text-red-700">{selected.item.containmentPct}% Containment</div>
                </div>
                <div>
                  <span className="text-slate-500">Flame Length:</span>
                  <div className="font-bold text-slate-900">{selected.item.maxFlameLengthMeters} m</div>
                </div>
                <div>
                  <span className="text-slate-500">Crown Behavior:</span>
                  <div className="font-bold text-slate-900">{selected.item.crownFireBehavior}</div>
                </div>
              </div>
              <p className="text-[11px] text-slate-600">Mapping: {selected.item.sourceMethod} by {selected.item.mappedByAgency}</p>
            </div>
          ) : selected?.kind === 'station' ? (
            <div className="space-y-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-200">
              <div className="text-[10px] font-mono font-bold uppercase text-emerald-800">RAWS Fire Weather & Fuel Moisture</div>
              <h3 className="font-semibold text-slate-900 text-sm">{selected.item.stationName}</h3>
              <p className="text-slate-600">Elevation: {selected.item.elevationMeters}m · Model: {selected.item.fuelModelNFDRS}</p>
              {(() => {
                const obs = getLatestFuelMoistureObservation(selected.item.stationId);
                return obs ? (
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded-lg border border-emerald-100">
                    <div>
                      <span className="text-slate-500">1-hr Dead FM:</span>
                      <div className="font-bold text-emerald-900">{obs.deadFuelMoisture.oneHourPct}%</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Live Herb FM:</span>
                      <div className="font-bold text-emerald-900">{obs.liveFuelMoisture.herbaceousPct}%</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Energy Release (ERC):</span>
                      <div className="font-bold text-slate-900">{obs.energyReleaseComponent}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Soil Moisture 0-5cm:</span>
                      <div className="font-bold text-slate-900">{obs.soilMoistureSurfacePct}%</div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          ) : selected?.kind === 'infrastructure' ? (
            <div className="space-y-1.5 bg-purple-50/50 p-3 rounded-xl border border-purple-200">
              <div className="text-[10px] font-mono font-bold uppercase text-purple-800">Critical Infrastructure Asset</div>
              <h3 className="font-semibold text-slate-900 text-sm">{selected.item.name}</h3>
              <p className="text-slate-600">Category: {selected.item.category.replace(/_/g, ' ')}</p>
              <p className="text-slate-600">Capacity: {selected.item.capacityMetric}</p>
              <p className="text-slate-600">Proximity to Fire: {selected.item.distanceToFireFrontKm} km</p>
              <p className="font-semibold text-purple-900">Status: {selected.item.operationalStatus}</p>
            </div>
          ) : selected?.kind === 'hazard' ? (
            <div className="space-y-1.5 bg-red-50/50 p-3 rounded-xl border border-red-200">
              <div className="text-[10px] font-mono font-bold uppercase text-red-800">Road Corridor Hazard & Closure</div>
              <h3 className="font-semibold text-slate-900 text-sm">{selected.item.roadName} ({selected.item.highwayCode})</h3>
              <p className="font-semibold text-red-700">Type: {selected.item.hazardType.replace(/_/g, ' ')}</p>
              {selected.item.maxVehicleWeightTons && (
                <p className="text-slate-700">Bridge Limit: Max {selected.item.maxVehicleWeightTons} Metric Tons</p>
              )}
              <p className="text-slate-600 text-[11px] leading-relaxed mt-1">Detour: {selected.item.tacticalDetourRecommendation}</p>
            </div>
          ) : selected?.kind === 'apparatus' ? (
            <div className="space-y-1.5 bg-amber-50/50 p-3 rounded-xl border border-amber-200">
              <div className="text-[10px] font-mono font-bold uppercase text-amber-800">Live Responder AVL Telemetry</div>
              <h3 className="font-semibold text-slate-900 text-sm">{selected.item.callsign}</h3>
              <p className="text-slate-600">Class: {selected.item.vehicleClass.replace(/_/g, ' ')}</p>
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded-lg border border-amber-100">
                <div>
                  <span className="text-slate-500">Water Tank:</span>
                  <div className="font-bold text-amber-900">{selected.item.waterRemainingPct}% ({selected.item.waterTankCapacityLiters}L)</div>
                </div>
                <div>
                  <span className="text-slate-500">Fuel Level:</span>
                  <div className="font-bold text-slate-900">{selected.item.fuelRemainingPct}%</div>
                </div>
                <div>
                  <span className="text-slate-500">CAD Status:</span>
                  <div className="font-bold text-slate-900">{selected.item.cadStatus.replace(/_/g, ' ')}</div>
                </div>
                <div>
                  <span className="text-slate-500">Crew on Board:</span>
                  <div className="font-bold text-slate-900">{selected.item.crewOnBoard} Personnel</div>
                </div>
              </div>
            </div>
          ) : selected?.kind === 'cad' ? (
            <div className="space-y-1.5 bg-blue-50/50 p-3 rounded-xl border border-blue-200">
              <div className="text-[10px] font-mono font-bold uppercase text-blue-800">Emergency Dispatch CAD Event</div>
              <h3 className="font-semibold text-slate-900 text-sm">{selected.item.cadEventId}</h3>
              <p className="text-slate-600">Priority: {selected.item.callPriority.replace(/_/g, ' ')}</p>
              <p className="text-slate-600">Center: {selected.item.dispatchCenter}</p>
              <div className="space-y-1 mt-2 text-[11px]">
                <div className="font-semibold text-slate-800">CAD Event Log:</div>
                {selected.item.cadLogEntries.map((log, idx) => (
                  <div key={idx} className="border-l-2 border-blue-400 pl-2 py-0.5 text-slate-600">
                    <span className="font-mono text-slate-400">{log.timestampUtc.slice(11, 16)} UTC:</span> {log.actionNote}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Scientific Layer Interpretation</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-600 shrink-0 mt-1" />
                  <p><strong>NASA FIRMS Hotspots:</strong> Satellite radiometer pixel thermal anomalies (MODIS 1km, VIIRS 375m). Not guaranteed fire perimeter.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2.5 h-2.5 rotate-45 bg-rose-700 shrink-0 mt-1" />
                  <p><strong>NASA EONET Events:</strong> Global curator wildfire records with agency attribution.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-red-600 shrink-0 mt-1" />
                  <p><strong>NIFC WFIGS Perimeters:</strong> Verified aerial/ground surveyed perimeter polygons and Rothermel spread isochrones.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-600 shrink-0 mt-1" />
                  <p><strong>RAWS Stations:</strong> Continuous Nelson model 1-hr/10-hr dead fuel moisture and SMAP soil moisture.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500 shrink-0 mt-1" />
                  <p><strong>Roads & AVL Fleet:</strong> Closed corridors, bridge gross weight limits, and real-time apparatus water/fuel gauges.</p>
                </div>
              </div>
              <p className="text-slate-500 text-[11px]">
                Click any map feature, perimeter boundary, or apparatus to inspect authenticated telemetry.
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};
