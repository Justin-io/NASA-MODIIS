import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import {
  IncidentRecord,
  MapBaseViewMode,
  ResourceAsset,
  RouteOption,
} from '../shared/types';
import { MonitoredRegion, MONITORED_REGIONS } from '../shared/dataAdapter';
import { generateRegionalIntensityGrid } from '../shared/intelligenceEngine';
import { formatVerificationLabel } from '../shared/ui';

interface GeospatialMapCanvasProps {
  incidents: IncidentRecord[];
  selectedRegion?: MonitoredRegion;
  selectedIncidentId: string;
  onSelectIncident: (id: string) => void;
  routes: RouteOption[];
  resources: ResourceAsset[];
  onInspectIncidentWorkspace: (id: string) => void;
  onSwitchTo3DGlobe?: () => void;
}

export const GeospatialMapCanvas: React.FC<GeospatialMapCanvasProps> = ({
  incidents,
  selectedRegion = MONITORED_REGIONS[0],
  selectedIncidentId,
  onSelectIncident,
  routes,
  resources,
  onInspectIncidentWorkspace,
  onSwitchTo3DGlobe,
}) => {
  const [mapStyle, setMapStyle] = useState<MapBaseViewMode>('topographic');
  const [showLayerPanel, setShowLayerPanel] = useState(true);
  const [showD3Heatmap, setShowD3Heatmap] = useState(true);
  const [heatmapOpacityPct, setHeatmapOpacityPct] = useState<number>(85);
  const [heatmapMetric, setHeatmapMetric] = useState<'frp' | 'thermal_kelvin'>(
    'frp'
  );
  const [showModisFootprints, setShowModisFootprints] = useState(true);
  const [showViirsFootprints, setShowViirsFootprints] = useState(true);
  const [showUncertaintyRings, setShowUncertaintyRings] = useState(true);
  const [showWindVectors, setShowWindVectors] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showResources, setShowResources] = useState(true);
  const [timeWindowHours, setTimeWindowHours] = useState<6 | 12 | 24>(24);
  const [drawingMode, setDrawingMode] = useState<'pan' | 'cordon'>('pan');
  const [customCordonPoints, setCustomCordonPoints] = useState<
    { x: number; y: number }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMap, setExpandedMap] = useState(false);

  const handleSelectBaseView = (mode: MapBaseViewMode) => {
    setMapStyle(mode);
    if (mode === 'thermal_heatmap') {
      setShowD3Heatmap(true);
    }
  };

  const projectCoord = (lat: number, lng: number) => {
    const x = ((lng - 76.34) / (76.95 - 76.34)) * 900;
    const y = ((11.62 - lat) / (11.62 - 11.26)) * 480;
    return {
      x: Math.max(30, Math.min(870, x)),
      y: Math.max(30, Math.min(450, y)),
    };
  };

  // Regional intensity multiplier so switching selectedRegion dynamically updates the D3 heatmap field
  const regionalAdjustedIncidents = useMemo(() => {
    const regionMultiplier =
      selectedRegion.id === 'REG-SIERRA'
        ? 1.18
        : selectedRegion.id === 'REG-ARCADIA'
        ? 0.92
        : 1.0;
    const windShift =
      selectedRegion.id === 'REG-SIERRA'
        ? -25
        : selectedRegion.id === 'REG-ARCADIA'
        ? 20
        : 0;

    return incidents.map((inc) => ({
      ...inc,
      harmonizedFrpMw: Number(
        (inc.harmonizedFrpMw * regionMultiplier).toFixed(1)
      ),
      windDirectionDeg: (inc.windDirectionDeg + windShift + 360) % 360,
    }));
  }, [incidents, selectedRegion.id]);

  // Compute D3 Contour Polygons and Color Scale for Real-Time Wildfire Intensity Heatmap
  const d3HeatmapData = useMemo(() => {
    const gridCols = 60;
    const gridRows = 32;
    const grid = generateRegionalIntensityGrid(
      regionalAdjustedIncidents,
      gridCols,
      gridRows,
      projectCoord,
      900,
      480,
      heatmapMetric
    );

    const thresholds =
      heatmapMetric === 'frp'
        ? [10, 26, 48, 76, 108, 140]
        : [22, 48, 82, 125, 168, 210];

    const contourGenerator = d3
      .contours()
      .size([gridCols, gridRows])
      .thresholds(thresholds);

    const contourMultiPolygons = contourGenerator(grid.values);

    // Scale from 60x32 grid space into 900x480 SVG viewport
    const transform = d3.geoTransform({
      point(x, y) {
        this.stream.point((x / gridCols) * 900, (y / gridRows) * 480);
      },
    });
    const pathGenerator = d3.geoPath(transform);

    const maxDomain = Math.max(
      thresholds[thresholds.length - 1] * 1.1,
      grid.peakValue
    );
    const interpolator =
      mapStyle === 'thermal_heatmap'
        ? d3.interpolateInferno
        : d3.interpolateYlOrRd;
    const colorScale = d3
      .scaleSequential(interpolator)
      .domain([0, maxDomain]);

    const opacityFactor = heatmapOpacityPct / 100;
    const baseBoost = mapStyle === 'thermal_heatmap' ? 1.35 : 1.0;

    const layers = contourMultiPolygons.map((poly, idx) => ({
      value: poly.value,
      d: pathGenerator(poly) || '',
      fill: colorScale(poly.value),
      stroke:
        d3.color(colorScale(poly.value))?.darker(0.25)?.formatHex() ||
        '#ea580c',
      opacity: Math.min(
        0.92,
        (0.16 + idx * 0.06) * opacityFactor * baseBoost
      ),
    }));

    return {
      layers,
      peakValue: grid.peakValue,
      meanActiveValue: grid.meanActiveValue,
      thresholds,
      colorScale,
    };
  }, [regionalAdjustedIncidents, heatmapMetric, mapStyle, heatmapOpacityPct]);

  const selectedIncident =
    incidents.find((inc) => inc.id === selectedIncidentId) || incidents[0] || null;

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (drawingMode === 'pan') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 900;
    const y = ((e.clientY - rect.top) / rect.height) * 480;
    setCustomCordonPoints((prev) => [...prev.slice(-5), { x, y }]);
  };

  const filteredIncidents = incidents.filter((inc) =>
    searchQuery.trim() === ''
      ? true
      : inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isDarkMap =
    mapStyle === 'satellite' || mapStyle === 'thermal_heatmap';

  const bgFill =
    mapStyle === 'topographic'
      ? '#F4F7F9'
      : mapStyle === 'satellite'
      ? '#122620'
      : '#090D16';

  const gridStroke = isDarkMap
    ? 'rgba(148, 163, 184, 0.16)'
    : 'rgba(148, 163, 184, 0.25)';

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {/* Top Map Control Bar — Responsive on Mobile & Desktop */}
      <div className="p-3 sm:px-4 sm:py-3 border-b border-slate-200/80 flex flex-col gap-2.5 bg-[#FAFBFC]">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 w-full xl:w-auto flex-wrap sm:flex-nowrap">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter map incidents or sector..."
              aria-label="Filter map incidents or sector"
              className="w-full sm:w-44 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600"
            />
            <button
              type="button"
              onClick={() => setShowLayerPanel((v) => !v)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-xl border whitespace-nowrap shrink-0 transition-colors ${
                showLayerPanel
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {showLayerPanel ? '● Layer Panel' : '○ Layer Panel'}
            </button>
            <button
              type="button"
              onClick={() => setExpandedMap((v) => !v)}
              className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              {expandedMap ? 'Standard Height' : 'Expand Map'}
            </button>
            {onSwitchTo3DGlobe && (
              <button
                type="button"
                onClick={onSwitchTo3DGlobe}
                aria-label="Toggle to 3D Scientific Globe"
                className="px-2.5 py-1.5 text-xs font-semibold bg-sky-600 text-white rounded-xl hover:bg-sky-700 whitespace-nowrap shrink-0 transition-colors"
              >
                3D Globe →
              </button>
            )}
          </div>

          {/* Map View Mode Switcher (Topographical / Satellite / Thermal Heatmap), D3 Metric & Time Controls */}
          <div className="flex items-center justify-between xl:justify-end gap-1.5 flex-wrap sm:flex-nowrap">
            <div
              role="group"
              aria-label="Base Map View Switcher"
              className="flex items-center bg-slate-200/80 p-0.5 rounded-lg shrink-0"
            >
              {(
                [
                  ['topographic', 'Topographical'],
                  ['satellite', 'Satellite'],
                  ['thermal_heatmap', 'Thermal Heatmap'],
                ] as [MapBaseViewMode, string][]
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleSelectBaseView(mode)}
                  className={`px-2 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                    mapStyle === mode
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* D3 Heatmap Metric Switcher */}
            <div className="flex items-center bg-amber-100/80 p-0.5 rounded-lg shrink-0 border border-amber-200/80">
              <button
                type="button"
                onClick={() => {
                  setShowD3Heatmap(true);
                  setHeatmapMetric('frp');
                }}
                className={`px-2 py-1 text-xs font-mono font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                  showD3Heatmap && heatmapMetric === 'frp'
                    ? 'bg-white text-amber-950 shadow-2xs'
                    : 'text-amber-900/75 hover:text-amber-950'
                }`}
              >
                D3 FRP
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowD3Heatmap(true);
                  setHeatmapMetric('thermal_kelvin');
                }}
                className={`px-2 py-1 text-xs font-mono font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                  showD3Heatmap && heatmapMetric === 'thermal_kelvin'
                    ? 'bg-white text-rose-950 shadow-2xs'
                    : 'text-amber-900/75 hover:text-amber-950'
                }`}
              >
                D3 Thermal
              </button>
            </div>

            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg shrink-0">
              {([6, 12, 24] as const).map((hrs) => (
                <button
                  key={hrs}
                  type="button"
                  onClick={() => setTimeWindowHours(hrs)}
                  className={`px-2 py-1 text-xs font-mono font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                    timeWindowHours === hrs
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {hrs}h
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                if (drawingMode === 'cordon') {
                  setDrawingMode('pan');
                  setCustomCordonPoints([]);
                } else {
                  setDrawingMode('cordon');
                }
              }}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 transition-colors ${
                drawingMode === 'cordon'
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {drawingMode === 'cordon' ? 'Clear Polygon' : 'Draw Sector'}
            </button>
          </div>
        </div>

        {/* Dedicated MapLibre / Mapbox Layer Management Panel */}
        {showLayerPanel && (
          <div
            data-testid="map-layer-management-panel"
            className="p-3 bg-white border border-slate-200/90 rounded-xl space-y-3 shadow-2xs"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-sky-700">
                  MapLibre GL Vector & Raster Layer Management
                </span>
                <span className="text-[11px] font-mono text-slate-400">·</span>
                <span className="text-[11px] font-mono text-slate-600">
                  Active View:{' '}
                  <strong className="text-slate-900">
                    {mapStyle === 'topographic'
                      ? 'Topographical DEM (Contours & Hydrography)'
                      : mapStyle === 'satellite'
                      ? 'Satellite Orbital (True-Color Multispectral)'
                      : 'Thermal Heatmap (Radiometric LWIR + D3 Isolines)'}
                  </strong>
                </span>
              </div>

              {/* Thermal Heatmap Opacity Slider */}
              <div className="flex items-center gap-2 text-xs">
                <label
                  htmlFor="map-heatmap-opacity"
                  className="font-mono text-[11px] text-slate-600 whitespace-nowrap"
                >
                  Heatmap Opacity:
                </label>
                <input
                  id="map-heatmap-opacity"
                  aria-label="Thermal Heatmap Layer Opacity"
                  type="range"
                  min={25}
                  max={100}
                  step={5}
                  value={heatmapOpacityPct}
                  onChange={(e) =>
                    setHeatmapOpacityPct(Number(e.target.value))
                  }
                  className="w-24 sm:w-28"
                />
                <span className="font-mono text-[11px] font-semibold text-slate-900 tabular-nums w-9">
                  {heatmapOpacityPct}%
                </span>
              </div>
            </div>

            {/* 3-Card Base Map View Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(
                [
                  {
                    id: 'topographic' as MapBaseViewMode,
                    title: 'Topographical Map View',
                    subtitle: '10m Elevation Contours, Escarpment Slope & Hydrography',
                    badge: 'DEM + Hillshade',
                    swatch: 'bg-slate-100 border-slate-300 text-slate-800',
                  },
                  {
                    id: 'satellite' as MapBaseViewMode,
                    title: 'Satellite Imagery View',
                    subtitle: 'Sentinel-2 / VIIRS True-Color Canopy & Orbital Graticule',
                    badge: '10m Optical Swath',
                    swatch: 'bg-emerald-950 border-emerald-700 text-emerald-100',
                  },
                  {
                    id: 'thermal_heatmap' as MapBaseViewMode,
                    title: 'Thermal Heatmap View',
                    subtitle: 'LWIR Radiometric Matrix with High-Contrast D3 Flux Isolines',
                    badge: 'LWIR + D3 Contours',
                    swatch: 'bg-slate-950 border-rose-500 text-amber-200',
                  },
                ]
              ).map((card) => {
                const isActive = mapStyle === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleSelectBaseView(card.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                      isActive
                        ? 'bg-sky-50/90 border-sky-600 ring-1 ring-sky-600'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full border shrink-0 ${card.swatch}`}
                        />
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {card.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {card.subtitle}
                      </div>
                    </div>
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                        isActive
                          ? 'bg-sky-700 text-white font-semibold'
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      {isActive ? 'Active' : card.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tactical Overlay Layer Toggles */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setShowD3Heatmap((v) => !v)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 transition-colors ${
                  showD3Heatmap
                    ? 'bg-orange-50 border-orange-300 text-orange-950 font-semibold'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {showD3Heatmap
                  ? '● D3 Wildfire Intensity Heatmap'
                  : '○ D3 Wildfire Intensity Heatmap'}
              </button>
              <button
                type="button"
                onClick={() => setShowViirsFootprints((v) => !v)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 transition-colors ${
                  showViirsFootprints
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {showViirsFootprints ? '● VIIRS 375m' : '○ VIIRS 375m'}
              </button>
              <button
                type="button"
                onClick={() => setShowModisFootprints((v) => !v)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 transition-colors ${
                  showModisFootprints
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {showModisFootprints ? '● MODIS 1km' : '○ MODIS 1km'}
              </button>
              <button
                type="button"
                onClick={() => setShowUncertaintyRings((v) => !v)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 transition-colors ${
                  showUncertaintyRings
                    ? 'bg-sky-50 border-sky-200 text-sky-900'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {showUncertaintyRings
                  ? '● Uncertainty Radii'
                  : '○ Uncertainty Radii'}
              </button>
              <button
                type="button"
                onClick={() => setShowWindVectors((v) => !v)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 transition-colors ${
                  showWindVectors
                    ? 'bg-teal-50 border-teal-200 text-teal-900'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {showWindVectors ? '● Wind Vectors' : '○ Wind Vectors'}
              </button>
              <button
                type="button"
                onClick={() => setShowRoutes((v) => !v)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 transition-colors ${
                  showRoutes
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {showRoutes ? '● Emergency Routes' : '○ Emergency Routes'}
              </button>
              <button
                type="button"
                onClick={() => setShowResources((v) => !v)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 transition-colors ${
                  showResources
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {showResources ? '● Units & Staging' : '○ Units & Staging'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Geospatial Map Canvas + Inspector Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-8 relative border-b lg:border-b-0 lg:border-r border-slate-200/80">
          <svg
            viewBox="0 0 900 480"
            onClick={handleSvgClick}
            className={`w-full ${
              expandedMap
                ? 'h-[420px] sm:h-[560px]'
                : 'h-[280px] sm:h-[430px]'
            } block select-none transition-all ${
              drawingMode === 'cordon' ? 'cursor-crosshair' : 'cursor-default'
            }`}
            role="img"
            aria-label={`${selectedRegion.name} Geospatial Operational Map (${mapStyle} view)`}
          >
            <defs>
              <filter id="d3-heatmap-blur" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="4.5" />
              </filter>
              <radialGradient id="sat-canopy-grad" cx="50%" cy="45%" r="65%">
                <stop offset="0%" stopColor="#1b3b2f" />
                <stop offset="55%" stopColor="#132a22" />
                <stop offset="100%" stopColor="#0c1c17" />
              </radialGradient>
            </defs>

            <rect
              width="900"
              height="480"
              fill={
                mapStyle === 'satellite' ? 'url(#sat-canopy-grad)' : bgFill
              }
            />

            {/* Satellite View: Orbital Multi-Spectral Canopy & Escarpment Relief Patches */}
            {mapStyle === 'satellite' && (
              <g opacity="0.65">
                <polygon
                  points="0,0 900,0 900,190 520,210 180,155 0,210"
                  fill="#244235"
                />
                <polygon
                  points="120,240 560,185 880,260 790,460 190,450"
                  fill="#193328"
                />
                <polygon
                  points="310,260 620,240 690,370 360,390"
                  fill="#2d4a34"
                  opacity="0.6"
                />
              </g>
            )}

            {/* Topographic Elevation Contours & Coordinate Graticules */}
            <g stroke={gridStroke} strokeWidth="1" fill="none">
              <path d="M 40 390 Q 250 320 480 350 T 860 280" />
              <path d="M 60 310 Q 300 220 540 260 T 850 190" />
              <path d="M 90 210 Q 350 140 590 175 T 840 110" />
              <path d="M 140 120 Q 410 70 660 95 T 830 55" />
              {[150, 300, 450, 600, 750].map((vx) => (
                <line
                  key={vx}
                  x1={vx}
                  y1={0}
                  x2={vx}
                  y2={480}
                  strokeDasharray="3 3"
                />
              ))}
              {[120, 240, 360].map((hy) => (
                <line
                  key={hy}
                  x1={0}
                  y1={hy}
                  x2={900}
                  y2={hy}
                  strokeDasharray="3 3"
                />
              ))}
            </g>

            {/* Topographic Elevation Contour Labels when in Topographic View */}
            {mapStyle === 'topographic' && (
              <g fontFamily="JetBrains Mono" fontSize="8.5" fill="#64748b">
                <text x={775} y={68}>1,850m ASL</text>
                <text x={775} y={182}>1,420m ASL</text>
                <text x={775} y={295}>980m ASL</text>
              </g>
            )}

            {/* Moyar River & Reservoir Hydrography */}
            <path
              d="M 180 140 Q 360 165 510 135 T 820 115"
              stroke={
                mapStyle === 'topographic'
                  ? '#bae6fd'
                  : mapStyle === 'satellite'
                  ? '#0ea5e9'
                  : '#0369a1'
              }
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              opacity={mapStyle === 'thermal_heatmap' ? 0.55 : 0.9}
            />

            {/* Real-Time D3 Wildfire Intensity Contour Heatmap Layer */}
            {showD3Heatmap && (
              <g data-testid="d3-heatmap-layer">
                {/* Softened Thermal Plume Diffusion Base */}
                <g filter="url(#d3-heatmap-blur)">
                  {d3HeatmapData.layers.map((layer) => (
                    <path
                      key={`blur-${layer.value}`}
                      d={layer.d}
                      fill={layer.fill}
                      fillOpacity={layer.opacity * 1.15}
                    />
                  ))}
                </g>
                {/* Crisp D3 Iso-Intensity Contour Rings */}
                {d3HeatmapData.layers.map((layer) => (
                  <path
                    key={`iso-${layer.value}`}
                    d={layer.d}
                    fill={layer.fill}
                    fillOpacity={layer.opacity * 0.65}
                    stroke={layer.stroke}
                    strokeWidth={mapStyle === 'thermal_heatmap' ? 1.5 : 1.1}
                    strokeOpacity={mapStyle === 'thermal_heatmap' ? 0.9 : 0.65}
                  />
                ))}
              </g>
            )}

            {/* Wind Direction Vector Arrows */}
            {showWindVectors && (
              <g
                stroke={isDarkMap ? '#38bdf8' : '#0284c7'}
                strokeWidth="1.4"
                opacity="0.65"
              >
                {[
                  [220, 120],
                  [420, 110],
                  [640, 130],
                  [280, 250],
                  [510, 240],
                  [710, 230],
                  [350, 360],
                  [580, 350],
                ].map(([wx, wy], i) => (
                  <g key={i} transform={`translate(${wx}, ${wy})`}>
                    <line x1="28" y1="-12" x2="-22" y2="10" />
                    <polygon
                      points="-22,10 -13,3 -16,12"
                      fill={isDarkMap ? '#38bdf8' : '#0284c7'}
                    />
                    <text
                      x="6"
                      y="-16"
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                      fill={isDarkMap ? '#cbd5e1' : '#475569'}
                      stroke="none"
                    >
                      34 km/h ENE
                    </text>
                  </g>
                ))}
              </g>
            )}

            {/* Emergency Corridors & Routes */}
            {showRoutes &&
              routes.map((rt) => {
                const pts = rt.waypoints.map(([lat, lng]) => {
                  const p = projectCoord(lat, lng);
                  return `${p.x},${p.y}`;
                });
                const strokeColor = rt.isPrimary
                  ? isDarkMap
                    ? '#60a5fa'
                    : '#2563eb'
                  : rt.reportedBlockages.length > 0
                  ? '#f59e0b'
                  : '#14b8a6';
                return (
                  <g key={rt.id}>
                    <polyline
                      points={pts.join(' ')}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={rt.isPrimary ? 3.5 : 2.5}
                      strokeDasharray={rt.isPrimary ? undefined : '6 4'}
                    />
                  </g>
                );
              })}

            {/* Resources & Staging Points */}
            {showResources &&
              resources.map((res) => {
                const pos = projectCoord(
                  res.coordinates.lat,
                  res.coordinates.lng
                );
                return (
                  <g key={res.id} transform={`translate(${pos.x}, ${pos.y})`}>
                    <rect
                      x="-6"
                      y="-6"
                      width="12"
                      height="12"
                      rx="3"
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    <text
                      x="10"
                      y="3"
                      fontSize="9.5"
                      fontFamily="JetBrains Mono"
                      fill={isDarkMap ? '#f1f5f9' : '#1e293b'}
                    >
                      {res.id}
                    </text>
                  </g>
                );
              })}

            {/* Custom Drawn Cordon Polygon */}
            {customCordonPoints.length > 1 && (
              <polygon
                points={customCordonPoints
                  .map((p) => `${p.x},${p.y}`)
                  .join(' ')}
                fill="rgba(14, 165, 233, 0.14)"
                stroke="#0284c7"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
            )}

            {/* Incidents: Uncertainty Rings, MODIS 1km & VIIRS 375m Footprints */}
            {filteredIncidents.map((inc) => {
              const pos = projectCoord(
                inc.coordinates.lat,
                inc.coordinates.lng
              );
              const isSelected = selectedIncident ? inc.id === selectedIncident.id : false;
              const radiusPx = Math.max(
                18,
                Math.min(58, inc.uncertaintyRadiusMeters / 11)
              );

              const toneStroke =
                inc.status === 'authority_confirmed_emergency'
                  ? '#e11d48'
                  : inc.status === 'field_confirmed'
                  ? '#ea580c'
                  : inc.status === 'independently_corroborated'
                  ? '#d97706'
                  : inc.status === 'candidate_incident'
                  ? '#0284c7'
                  : '#64748b';

              return (
                <g
                  key={inc.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectIncident(inc.id);
                  }}
                  className="cursor-pointer"
                >
                  {showUncertaintyRings && (
                    <circle
                      r={radiusPx}
                      fill={toneStroke}
                      fillOpacity={isSelected ? 0.18 : 0.1}
                      stroke={toneStroke}
                      strokeWidth={isSelected ? 2 : 1.2}
                      strokeDasharray="4 3"
                    />
                  )}

                  {showModisFootprints && inc.modisCount > 0 && (
                    <rect
                      x="-14"
                      y="-14"
                      width="28"
                      height="28"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.4"
                    />
                  )}

                  {showViirsFootprints && inc.viirsCount > 0 && (
                    <rect
                      x="-7"
                      y="-7"
                      width="14"
                      height="14"
                      fill={toneStroke}
                      fillOpacity="0.35"
                      stroke={toneStroke}
                      strokeWidth="1.5"
                    />
                  )}

                  <circle
                    r={isSelected ? 6 : 4.5}
                    fill={toneStroke}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />

                  <g transform="translate(12, -10)">
                    <rect
                      x="0"
                      y="-12"
                      width="156"
                      height="32"
                      rx="5"
                      fill={isSelected ? '#0f172a' : '#ffffff'}
                      stroke={isSelected ? '#38bdf8' : '#cbd5e1'}
                      strokeWidth="1"
                    />
                    <text
                      x="7"
                      y="1"
                      fontSize="10"
                      fontWeight="600"
                      fontFamily="Plus Jakarta Sans"
                      fill={isSelected ? '#ffffff' : '#0f172a'}
                    >
                      {inc.id} · {inc.harmonizedFrpMw} MW
                    </text>
                    <text
                      x="7"
                      y="13"
                      fontSize="8.5"
                      fontFamily="JetBrains Mono"
                      fill={isSelected ? '#94a3b8' : '#475569'}
                    >
                      ±{inc.uncertaintyRadiusMeters}m · {inc.windCompass}{' '}
                      {inc.windSpeedKmh}km/h
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Bottom Map Legend & D3 Wildfire Intensity Color Scale Bar */}
          <div className="px-3.5 py-2.5 bg-[#FAFBFC] border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-600">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="font-mono font-semibold text-slate-800">
                Legend:
              </span>
              <span>◆ Authority Emergency</span>
              <span>·</span>
              <span>▲ Field Confirmed</span>
              <span>·</span>
              <span>● Corroborated</span>
              <span>·</span>
              <span>○ Unverified</span>
            </div>

            {/* D3 Intensity Scale Readout */}
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-700 shrink-0">
              <span>
                D3 {heatmapMetric === 'frp' ? 'FRP' : 'Thermal'} Scale:
              </span>
              <div className="flex items-center h-2.5 w-24 rounded-xs overflow-hidden border border-slate-300">
                {[0.15, 0.35, 0.55, 0.75, 0.92].map((t, idx) => (
                  <span
                    key={idx}
                    className="flex-1 h-full"
                    style={{
                      backgroundColor:
                        mapStyle === 'thermal_heatmap'
                          ? d3.interpolateInferno(t)
                          : d3.interpolateYlOrRd(t),
                    }}
                  />
                ))}
              </div>
              <span className="font-semibold text-rose-700 tabular-nums">
                Peak {d3HeatmapData.peakValue}{' '}
                {heatmapMetric === 'frp' ? 'MW/km²' : 'K-Idx'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Tactical Incident Inspector Panel */}
        <div className="lg:col-span-4 p-4 sm:p-5 flex flex-col justify-between bg-white">
          {selectedIncident ? (
            <div>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-2">
                <span className="font-mono font-semibold text-slate-800">
                  {selectedIncident.id}
                </span>
                <span
                  className={`font-semibold ${
                    formatVerificationLabel(selectedIncident.status).toneClass
                  }`}
                >
                  {formatVerificationLabel(selectedIncident.status).glyph}{' '}
                  {formatVerificationLabel(selectedIncident.status).shortLabel}
                </span>
              </div>

              <h3 className="text-base font-semibold text-slate-900 leading-snug">
                {selectedIncident.title}
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                {selectedIncident.summary}
              </p>

              <div className="grid grid-cols-2 gap-3 my-4 pt-3 border-t border-slate-200/80">
                <div>
                  <div className="text-[11px] text-slate-500">
                    Harmonized FRP
                  </div>
                  <div className="text-lg font-mono font-semibold text-slate-900 tabular-nums">
                    {selectedIncident.harmonizedFrpMw}
                    <span className="text-xs font-mono text-slate-400 ml-1">
                      MW
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {(
                      selectedIncident.harmonizedFrpMw /
                      selectedIncident.historicalMedianFrpMw
                    ).toFixed(1)}
                    x 10-yr median
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-500">
                    Spatial Uncertainty
                  </div>
                  <div className="text-lg font-mono font-semibold text-slate-900 tabular-nums">
                    ±{selectedIncident.uncertaintyRadiusMeters}
                    <span className="text-xs font-mono text-slate-400 ml-1">
                      m
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    VIIRS: {selectedIncident.viirsCount} · MODIS:{' '}
                    {selectedIncident.modisCount}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-500">
                    Ridge Wind & RH
                  </div>
                  <div className="text-base font-mono font-semibold text-slate-900 tabular-nums">
                    {selectedIncident.windSpeedKmh}
                    <span className="text-xs font-mono text-slate-400 ml-1">
                      km/h {selectedIncident.windCompass}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    RH {selectedIncident.humidityPct}% ·{' '}
                    {selectedIncident.temperatureC}°C
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-500">
                    Estimated Exposure
                  </div>
                  <div className="text-base font-mono font-semibold text-slate-900 tabular-nums">
                    {selectedIncident.estimatedPopulationExposed.toLocaleString()}
                    <span className="text-xs font-mono text-slate-400 ml-1">
                      people
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    Footprint ~{selectedIncident.estimatedAreaHa} ha
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200/80 pt-3">
                <div className="text-xs font-semibold text-slate-800 mb-1.5">
                  Sensor & Field Provenance
                </div>
                <div className="pt-4 mt-4 border-t border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => onInspectIncidentWorkspace(selectedIncident.id)}
                    className="w-full min-h-[42px] py-2.5 px-4 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Open Full Incident Dossier & Timeline →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-sm font-semibold text-slate-900">No Incident Selected</div>
              <div className="text-xs text-slate-500 max-w-xs mt-1">
                Select a detection marker on the map or ingest satellite passes to inspect tactical telemetry.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

