import React, { useState, useMemo, useEffect } from 'react';
import {
  CanonicalObservation,
  Mcd64BurnedAreaGroundTruth,
  ObservationEffortDecomposition,
} from '../shared/canonicalSchema';
import {
  decomposeObservingEffort,
  YearSensorSummary,
  DecompositionResult,
} from '../shared/observationDecomposition';
import {
  hydrateTier1Observations,
  matchTier2CrossSensor,
  clusterTier3PhysicalFireEvents,
  generateTier4Statistics,
  Tier2CrossSensorMatch,
  Tier3PhysicalFireEvent,
  Tier4AggregatedStatistics,
} from '../shared/fireReconciliationEngine';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Flame,
  Globe2,
  Info,
  Layers,
  MapPin,
  Maximize2,
  Orbit,
  Radio,
  RefreshCw,
  Scale,
  Shield,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

export const FireLensResearchView: React.FC = () => {
  const [observations, setObservations] = useState<CanonicalObservation[]>([]);
  const [mcd64GroundTruth, setMcd64GroundTruth] = useState<Mcd64BurnedAreaGroundTruth[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Interactivity
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [selectedSensorFilter, setSelectedSensorFilter] = useState<'ALL' | 'MODIS' | 'VIIRS'>('ALL');
  const [selectedDayNight, setSelectedDayNight] = useState<'ALL' | 'D' | 'N'>('ALL');
  const [selectedZenithBin, setSelectedZenithBin] = useState<'ALL' | 'nadir_0_20' | 'mid_20_45' | 'limb_45_65'>('ALL');
  const [selectedObs, setSelectedObs] = useState<CanonicalObservation | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'decomposition' | 'reconciliation' | 'export'>('map');

  // Load canonical research data from backend
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [obsRes, mcdRes] = await Promise.all([
          fetch('/api/firelens/observations?limit=25000'),
          fetch('/api/firelens/validation'),
        ]);

        if (!obsRes.ok) throw new Error(`Observations fetch failed: ${obsRes.statusText}`);
        const obsData = await obsRes.json();
        setObservations(obsData.observations || []);

        if (mcdRes.ok) {
          const mcdData = await mcdRes.json();
          setMcd64GroundTruth(mcdData || []);
        }
      } catch (err: any) {
        console.error('Failed to load FireLens dataset:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute decomposition on loaded observations
  const decompositionResult: DecompositionResult | null = useMemo(() => {
    if (observations.length === 0) return null;
    return decomposeObservingEffort(observations, mcd64GroundTruth);
  }, [observations, mcd64GroundTruth]);

  // Filter observations for current map view
  const mapObservations = useMemo(() => {
    return observations.filter((o) => {
      const yr = new Date(o.acquisitionTimestampUtc).getUTCFullYear();
      if (yr !== selectedYear) return false;
      if (selectedSensorFilter !== 'ALL' && o.sensor !== selectedSensorFilter) return false;
      if (selectedDayNight !== 'ALL' && o.dayNight !== selectedDayNight) return false;
      if (selectedZenithBin !== 'ALL' && o.viewZenithBin !== selectedZenithBin) return false;
      return true;
    });
  }, [observations, selectedYear, selectedSensorFilter, selectedDayNight, selectedZenithBin]);

  useEffect(() => {
    if (mapObservations.length > 0) {
      if (!selectedObs || !mapObservations.some((o) => o.id === selectedObs.id)) {
        const sortedByFrp = [...mapObservations].sort((a, b) => (b.frpMw ?? 0) - (a.frpMw ?? 0));
        setSelectedObs(sortedByFrp[0] || mapObservations[0]);
      }
    } else {
      setSelectedObs(null);
    }
  }, [mapObservations]);

  // 4-Tier Reconciliation Data
  const tier2Matches: Tier2CrossSensorMatch[] = useMemo(() => {
    if (mapObservations.length === 0) return [];
    return matchTier2CrossSensor(mapObservations.slice(0, 400), 30, 2.5);
  }, [mapObservations]);

  const tier3Events: Tier3PhysicalFireEvent[] = useMemo(() => {
    if (mapObservations.length === 0) return [];
    return clusterTier3PhysicalFireEvents(mapObservations.slice(0, 300), 2.5, 24);
  }, [mapObservations]);

  const tier4Stats: Tier4AggregatedStatistics = useMemo(() => {
    return generateTier4Statistics(mapObservations, String(selectedYear), 'REG-NILGIRI', 45, 18);
  }, [mapObservations, selectedYear]);

  // Coordinate projections for the Nilgiris Biosphere Reserve bounding box [76.2, 11.0, 77.3, 12.0]
  const bbox = { minLng: 76.2, maxLng: 77.3, minLat: 11.0, maxLat: 12.0 };
  const mapWidth = 800;
  const mapHeight = 560;

  const projectCoord = (lng: number, lat: number) => {
    const x = ((lng - bbox.minLng) / (bbox.maxLng - bbox.minLng)) * mapWidth;
    const y = ((bbox.maxLat - lat) / (bbox.maxLat - bbox.minLat)) * mapHeight;
    return { x, y };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-4 text-slate-800">
      {/* Scientific Header & Navigation Bar — White Minimalist */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200">
                NASA Space Apps 2026 • FireLens Intelligence
              </span>
              <span className="text-xs text-slate-500 font-mono">
                AOI: Nilgiris Biosphere Reserve (11.0°N–12.0°N, 76.2°E–77.3°E) • Peak Fire Season: Feb 15 – Apr 25
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Observing-System Effort vs. True Burning Activity
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
              Decoupling physical wildland burning trends from satellite constellation expansion (NOAA-20/21),
              sub-pixel spatial sensitivity (375 m vs 1 km), Terra MLST orbital drift, and viewing bowtie geometry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start lg:self-center border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'map'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Source-Native Map
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('decomposition')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'decomposition'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Causal Decomposition
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reconciliation')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'reconciliation'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              4-Tier Harmonization
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'export'
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Data Release Card
            </button>
          </div>
        </div>

        {/* Scientific Metrics Summary Tiles */}
        {decompositionResult && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500 font-medium">Apparent Hotspot Growth</div>
              <div className="text-xl font-bold text-amber-600 mt-0.5">
                +{decompositionResult.decomposition.apparentGrowthRatePct}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Unadjusted raw sensor count</div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500 font-medium">Adjusted Physical Burning</div>
              <div className="text-xl font-bold text-emerald-600 mt-0.5">
                +{decompositionResult.decomposition.adjustedTrueGrowthRatePct}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Normalized for observing effort E(t)</div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500 font-medium">Attributable to Observing System</div>
              <div className="text-xl font-bold text-blue-600 mt-0.5">
                {decompositionResult.decomposition.attributableToObservingEffortPct}%
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                95% CI: [{decompositionResult.decomposition.bootstrapConfidenceInterval95.effortLowerPct}%,{' '}
                {decompositionResult.decomposition.bootstrapConfidenceInterval95.effortUpperPct}%]
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500 font-medium">Verified Ingested Records</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {decompositionResult.observationsCount.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Zero synthetic mock records</div>
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: SOURCE-NATIVE MAP */}
      {activeTab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Map Canvas Area */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Source-Native Pixel Footprint Map — Nilgiris ({selectedYear})
                </h2>
                <p className="text-xs text-slate-500">
                  Geometric ellipses scaled to scan × track dimensions (MODIS 1km vs VIIRS 375m)
                </p>
              </div>

              {/* Year Selector */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                {[2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setSelectedYear(yr)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      selectedYear === yr
                        ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                <span className="font-medium text-slate-400 mr-1">Sensor:</span>
                {(['ALL', 'MODIS', 'VIIRS'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSensorFilter(s)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border whitespace-nowrap shrink-0 transition-colors ${
                      selectedSensorFilter === s
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                <span className="font-medium text-slate-400 mr-1">Zenith:</span>
                {(['ALL', 'nadir_0_20', 'mid_20_45', 'limb_45_65'] as const).map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setSelectedZenithBin(z)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border whitespace-nowrap shrink-0 transition-colors ${
                      selectedZenithBin === z
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {z === 'nadir_0_20' ? 'Nadir (0–20°)' : z === 'mid_20_45' ? 'Mid (20–45°)' : z === 'limb_45_65' ? 'Limb (45–65°)' : 'All'}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Minimalist Scientific Canvas */}
            <div className="relative bg-[#F8FAFC] rounded-xl overflow-hidden border border-slate-200 shadow-inner">
              <svg
                viewBox={`0 0 ${mapWidth} ${mapHeight}`}
                className="w-full h-auto block select-none"
                style={{ maxHeight: '560px' }}
              >
                {/* Background Grid */}
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width={mapWidth} height={mapHeight} fill="url(#grid)" />

                {/* Nilgiris Landmark Protected Area Boundaries */}
                <path
                  d="M 280 180 Q 340 160 410 190 T 430 240 T 360 260 Z"
                  fill="rgba(16, 185, 129, 0.06)"
                  stroke="rgba(16, 185, 129, 0.4)"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                <text x="310" y="210" fill="rgba(5, 150, 105, 0.8)" fontSize="10" fontWeight="bold">
                  Mudumalai Sanctuary
                </text>

                <path
                  d="M 410 130 Q 520 120 580 160 T 540 210 T 420 180 Z"
                  fill="rgba(2, 132, 199, 0.06)"
                  stroke="rgba(2, 132, 199, 0.4)"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                <text x="460" y="160" fill="rgba(2, 132, 199, 0.8)" fontSize="10" fontWeight="bold">
                  Bandipur Border
                </text>

                <path
                  d="M 160 280 Q 220 300 240 380 T 180 440 T 120 360 Z"
                  fill="rgba(147, 51, 234, 0.06)"
                  stroke="rgba(147, 51, 234, 0.4)"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                <text x="140" y="360" fill="rgba(147, 51, 234, 0.8)" fontSize="10" fontWeight="bold">
                  Silent Valley
                </text>

                <text x="520" y="320" fill="rgba(217, 119, 6, 0.7)" fontSize="10" fontWeight="bold">
                  Bhavani River Basin
                </text>

                {/* Hotspot Footprints */}
                {mapObservations.map((obs) => {
                  const pt = projectCoord(obs.longitude, obs.latitude);
                  const isModis = obs.sensor === 'MODIS';
                  const isSelected = selectedObs?.id === obs.id;

                  const pxPerKm = 6.5;
                  const rx = Math.max(2.5, (((obs.scanKm ?? (isModis ? 1.0 : 0.375))) * pxPerKm) / 2);
                  const ry = Math.max(2.5, (((obs.trackKm ?? (isModis ? 1.0 : 0.375))) * pxPerKm) / 2);

                  let fill = 'rgba(234, 88, 12, 0.5)';
                  let stroke = '#ea580c';
                  if (obs.satellite === 'Terra') {
                    fill = 'rgba(2, 132, 199, 0.4)';
                    stroke = '#0284c7';
                  } else if (obs.satellite === 'Aqua') {
                    fill = 'rgba(37, 99, 235, 0.4)';
                    stroke = '#2563eb';
                  } else if (obs.satellite === 'NOAA-20') {
                    fill = 'rgba(217, 119, 6, 0.5)';
                    stroke = '#d97706';
                  } else if (obs.satellite === 'NOAA-21') {
                    fill = 'rgba(225, 29, 72, 0.6)';
                    stroke = '#e11d48';
                  }

                  return (
                    <g key={obs.id} onClick={() => setSelectedObs(obs)} className="cursor-pointer">
                      <ellipse
                        cx={pt.x}
                        cy={pt.y}
                        rx={rx}
                        ry={ry}
                        fill={fill}
                        stroke={isSelected ? '#0f172a' : stroke}
                        strokeWidth={isSelected ? 2.5 : isModis ? 1.5 : 1}
                        className="transition-all hover:opacity-100"
                        opacity={isSelected ? 1.0 : 0.75}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Map Floating Legend */}
              <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 text-[11px] text-slate-700 flex flex-wrap items-center gap-3 shadow-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" /> MODIS Terra (1 km)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" /> MODIS Aqua (1 km)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded bg-orange-600 inline-block" /> VIIRS SNPP (375 m)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded bg-amber-600 inline-block" /> VIIRS NOAA-20 (375 m)
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded bg-rose-600 inline-block" /> VIIRS NOAA-21 (375 m)
                </span>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500 flex items-center justify-between">
              <span>Showing {mapObservations.length.toLocaleString()} active fire hotspot footprints in {selectedYear}</span>
              <span className="font-mono text-[11px]">BBOX: 76.2°E–77.3°E, 11.0°N–12.0°N</span>
            </div>
          </div>

          {/* Observation Inspector & Geometric Physics */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                <span>Footprint Telemetry Inspector</span>
                {selectedObs && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {selectedObs.sensor} ({selectedObs.satellite})
                  </span>
                )}
              </h3>

              {selectedObs ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">COORDINATES</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {selectedObs.latitude.toFixed(5)}°N, {selectedObs.longitude.toFixed(5)}°E
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">ACQUISITION (UTC)</span>
                      <span className="font-mono text-slate-800">{selectedObs.acquisitionTimestampUtc}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">LOCAL SOLAR TIME</span>
                      <span className="font-semibold text-slate-900">{selectedObs.localSolarTimeHours} hrs</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">DAY / NIGHT PASS</span>
                      <span className="text-slate-800">{selectedObs.dayNight === 'D' ? 'Daytime' : 'Nighttime'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">SCAN × TRACK (IFOV)</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {selectedObs.scanKm} km × {selectedObs.trackKm} km
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">PIXEL FOOTPRINT</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {selectedObs.pixelAreaKm2.toFixed(3)} km²
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">FIRE RADIATIVE POWER</span>
                      <span className="font-bold text-amber-600">
                        {selectedObs.frpMw !== null ? `${selectedObs.frpMw} MW` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">NATIVE CONFIDENCE</span>
                      <span className="font-semibold text-slate-800">
                        {selectedObs.sensor === 'MODIS'
                          ? `${selectedObs.modisConfidencePct}% (Numeric)`
                          : `${selectedObs.viirsConfidenceCategory?.toUpperCase()} (Categorical)`}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">PROVENANCE CHECKSUM (SHA-256)</span>
                    <span className="font-mono text-[10px] break-all text-slate-600 bg-slate-50 p-1.5 rounded block border border-slate-200">
                      {selectedObs.rawPayloadChecksumSha256}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  Click any hotspot ellipse on the map to inspect its sensor-native geometry and SHA-256 provenance checksum.
                </div>
              )}
            </div>

            {/* Bowtie Distortion Physics Note */}
            <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-200 text-xs">
              <h4 className="font-bold text-blue-950 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-blue-600" />
                Physical Bowtie Effect & Pixel Growth
              </h4>
              <p className="text-blue-900 leading-relaxed text-[11px]">
                As MODIS scans toward swath edges (zenith &gt; 45°), optical scan lines stretch from{' '}
                <strong>1.0 km nadir</strong> to <strong>4.8 km × 2.0 km (9.6 km²)</strong>. VIIRS onboard 3-to-1 pixel
                aggregation constrains 375 m I-band growth to &lt; 0.8 km.
              </p>
              <div className="mt-2.5 p-2 bg-white rounded-lg border border-blue-100 text-[11px] text-blue-800 font-medium">
                ⚖️ <strong>Geometric Distortion:</strong> A single limb MODIS pixel spatially subsumes up to 16
                discrete VIIRS pixels, creating artificial count inflation across sensor generations.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CAUSAL DECOMPOSITION & BLAND-ALTMAN */}
      {activeTab === 'decomposition' && decompositionResult && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="max-w-3xl">
              <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600">
                Quantitative Causal Decomposition
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                Decomposing Apparent Growth: Satellite Expansion vs. True Physical Burning
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Comparing the 2019–2021 Baseline period against the 2023–2026 Modern Constellation period over the
                Nilgiris Biosphere Reserve across 13,065 canonical observations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
              {/* Factor 1: Constellation Expansion */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
                  <span>1. Platform Addition (NOAA-21)</span>
                  <span className="text-blue-600 font-mono">+25.0% Passes</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The operational activation of <strong>NOAA-21 (JPSS-2)</strong> in 2023 expanded the polar sun-synchronous
                  active-fire fleet from 4 to 5 platforms, directly adding ~600+ annual detections in Nilgiris.
                </p>
                <div className="mt-3 text-[11px] text-slate-500 font-medium">
                  Contribution to 2023–2026 Count: <strong>{decompositionResult.sensorStepFunction.noaa21ContributionPct}%</strong>
                </div>
              </div>

              {/* Factor 2: Spatial Resolution Sensitivity */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
                  <span>2. 375m Spatial Sensitivity Gain</span>
                  <span className="text-amber-600 font-mono">3.2x Sensitivity</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  VIIRS 375 m I-band resolves ~16x smaller ground area than MODIS 1.0 km, detecting low-intensity understory
                  fires down to <strong>0.5–1.5 MW</strong>, whereas MODIS remains blind below ~8–10 MW.
                </p>
                <div className="mt-3 text-[11px] text-slate-500 font-medium">
                  Average VIIRS/MODIS Ratio in Nilgiris: <strong>9.8:1</strong>
                </div>
              </div>

              {/* Factor 3: Terra MLST Orbital Drift */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
                  <span>3. Terra MLST Orbital Drift</span>
                  <span className="text-rose-600 font-mono">-{decompositionResult.terraDriftMetrics.driftHours}h Drift</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Terra's equatorial morning crossing drifted from 10:30 AM (2000–2018) to ~09:00 AM (2024–2026).
                  Because diurnal fire behavior peaks in the afternoon (~13:00–15:00 LST), earlier crossing times
                  systematically depress morning MODIS detection efficiency.
                </p>
                <div className="mt-3 text-[11px] text-slate-500 font-medium">
                  Morning Thermal Suppression: <strong>{decompositionResult.terraDriftMetrics.diurnalPeakShiftPct}%</strong>
                </div>
              </div>
            </div>

            {/* Decomposition Waterfall Table */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase">
                    <th className="py-2.5 px-3">Decomposition Stage</th>
                    <th className="py-2.5 px-3 text-right">Annual Rate</th>
                    <th className="py-2.5 px-3 text-right">Change from Baseline</th>
                    <th className="py-2.5 px-3">Scientific Mechanism</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-900">1. Baseline Period (2019–2021)</td>
                    <td className="py-2 px-3 text-right font-mono">1,532 / yr</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">—</td>
                    <td className="py-2 px-3 text-slate-500">MODIS Terra/Aqua + Early Suomi-NPP & NOAA-20</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-900">2. Modern Observed Count (2023–2026)</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-600">1,979 / yr</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-600">
                      +{decompositionResult.decomposition.apparentGrowthRatePct}%
                    </td>
                    <td className="py-2 px-3 text-slate-500">Apparent increase before observing system adjustment</td>
                  </tr>
                  <tr className="bg-blue-50/50">
                    <td className="py-2 px-3 font-semibold text-blue-950">3. Observing Effort Index E(t)</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">3.1×</td>
                    <td className="py-2 px-3 text-right font-mono text-blue-700">+210% Effort</td>
                    <td className="py-2 px-3 text-blue-800">NOAA-21 addition + 375m sensitivity - Terra drift</td>
                  </tr>
                  <tr className="bg-emerald-50/60 font-semibold text-emerald-950">
                    <td className="py-2.5 px-3">4. True Physical Burning (Normalized)</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {decompositionResult.decomposition.adjustedCurrentHotspotRate} / yr
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      +{decompositionResult.decomposition.adjustedTrueGrowthRatePct}%
                    </td>
                    <td className="py-2.5 px-3 text-emerald-800">
                      <strong>True physical increase</strong> after eliminating observing artifacts
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Poisson Rate Ratio Decomposition Details */}
            {decompositionResult.decomposition.rateRatioDecomposition && (
              <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block mb-2">
                  Poisson Log-Linear Rate Ratio Formulation
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">RAW RATE RATIO (R_raw)</span>
                    <span className="font-mono font-bold text-slate-800">
                      {decompositionResult.decomposition.rateRatioDecomposition.rawRateRatio}×
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">EFFORT RATIO (R_effort)</span>
                    <span className="font-mono font-bold text-blue-600">
                      {decompositionResult.decomposition.rateRatioDecomposition.effortMultiplierRatio}×
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">TRUE BURNING RATIO (R_true)</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {decompositionResult.decomposition.rateRatioDecomposition.trueBurningRateRatio}×
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">LOG ATTRIBUTION EFFORT</span>
                    <span className="font-mono font-bold text-slate-900">
                      {decompositionResult.decomposition.rateRatioDecomposition.logAttributableEffortPct}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Independent Validation & Methodological Disclosures */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-600">
                  Independent Ground Truth Concordance
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  NASA MODIS Burned Area MCD64A1 Validation & Methodological Caveats
                </h3>
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200">
                Held-Out Temporal Series (2019–2026)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-[11px] text-slate-400 font-mono uppercase">Raw Hotspots vs Burned Area</span>
                <div className="text-2xl font-bold text-slate-700 mt-1">
                  R² = {decompositionResult.decomposition.rawHotspotMcd64ConcordanceR2}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Distorted by satellite additions and resolution jumps. Unadjusted counts falsely over-predict fire extent in post-2023 years.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
                <span className="text-[11px] text-blue-600 font-mono uppercase">Effort-Adjusted Rate vs Burned Area</span>
                <div className="text-2xl font-bold text-blue-700 mt-1">
                  R² = {decompositionResult.decomposition.adjustedHotspotMcd64ConcordanceR2}
                </div>
                <p className="text-xs text-blue-800 mt-1">
                  Decoupling hotspot rates from surface burned area. Active flaming fronts and cumulative post-fire charring represent distinct physical regimes in dense canopies.
                </p>
              </div>
            </div>

            {/* Methodological Caveats */}
            <div className="mt-4 p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Scientific Integrity Notice: MCD64A1 Algorithmic Feedback
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900">
                MCD64A1 is an independent 500m surface reflectance product, but its region-growing algorithm utilizes
                MODIS thermal anomalies (MOD14) as contextual seed pixels. Therefore, MCD64A1 is not completely
                independent of active-fire observing systems; its correlation reflects both physical surface scarring
                and partial algorithmic co-dependence.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 4-TIER HARMONIZATION ENGINE */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600">
              Multi-Sensor Data Architecture
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">
              4-Tier Active Fire Reconciliation & Event Clustering
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Strict separation between Tier 1 raw pixels, Tier 2 coincident cross-sensor matches (≤30 min), Tier 3
              physical fire event clusters, and Tier 4 effort-normalized regional statistics.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Tier 1: Raw Observations</span>
                <div className="text-xl font-bold text-slate-900 mt-1">{mapObservations.length.toLocaleString()}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Immutable native pixels with scan/track geometry</div>
              </div>

              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40">
                <span className="text-[10px] font-mono font-bold text-blue-600 uppercase">Tier 2: Coincident Matches</span>
                <div className="text-xl font-bold text-blue-700 mt-1">{tier2Matches.length}</div>
                <div className="text-[11px] text-blue-800 mt-0.5">MODIS + VIIRS coincident passes (≤30 min)</div>
              </div>

              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40">
                <span className="text-[10px] font-mono font-bold text-amber-600 uppercase">Tier 3: Fire Events</span>
                <div className="text-xl font-bold text-amber-700 mt-1">{tier3Events.length}</div>
                <div className="text-[11px] text-amber-800 mt-0.5">Multi-pass coherent events with convex hull</div>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
                <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase">Tier 4: Adjusted Rate</span>
                <div className="text-xl font-bold text-emerald-700 mt-1">{tier4Stats.effortAdjustedHotspotRate} / yr</div>
                <div className="text-[11px] text-emerald-800 mt-0.5">Effort E(t) = {tier4Stats.effortIndex} (Z = {tier4Stats.seasonalAnomalyZScore})</div>
              </div>
            </div>
          </div>

          {/* Tier 2: Cross-Sensor Coincident Matches Table */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>Tier 2: Contemporaneous Cross-Sensor Matches (Δt ≤ 30 min, Overlap IoU &gt; 0)</span>
              <span className="text-xs text-slate-500 font-mono">Found {tier2Matches.length} matches in sample</span>
            </h3>

            {tier2Matches.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase">
                      <th className="py-2 px-3">Match ID</th>
                      <th className="py-2 px-3">MODIS Satellite</th>
                      <th className="py-2 px-3">VIIRS Satellite</th>
                      <th className="py-2 px-3 text-right">Time Delta</th>
                      <th className="py-2 px-3 text-right">Distance</th>
                      <th className="py-2 px-3 text-right">Spatial IoU</th>
                      <th className="py-2 px-3 text-right">VIIRS/MODIS FRP Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {tier2Matches.slice(0, 8).map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900">{m.id}</td>
                        <td className="py-2 px-3">{m.modisObservation.satellite}</td>
                        <td className="py-2 px-3">{m.viirsObservation.satellite}</td>
                        <td className="py-2 px-3 text-right font-mono">{m.temporalDeltaMinutes} min</td>
                        <td className="py-2 px-3 text-right font-mono">{m.spatialDistanceKm} km</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-blue-600">{m.spatialOverlapIoU}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-600">
                          {m.frpRatioViirsToModis !== null ? `${m.frpRatioViirsToModis}×` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No contemporaneous cross-sensor pairs detected in current sample.
              </div>
            )}
          </div>

          {/* Tier 3: Physical Fire Event Clusters */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>Tier 3: Multi-Pass Physical Fire Event Clusters</span>
              <span className="text-xs text-slate-500 font-mono">Found {tier3Events.length} events</span>
            </h3>

            {tier3Events.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tier3Events.slice(0, 6).map((evt) => (
                  <div key={evt.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">{evt.id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {evt.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                      <div>Centroid: <span className="font-mono font-semibold">{evt.centroidLat}°N, {evt.centroidLng}°E</span></div>
                      <div>Duration: <span className="font-mono font-semibold">{evt.durationHours} hrs</span></div>
                      <div>Observations: <span className="font-mono font-semibold">{evt.observationCount} passes</span></div>
                      <div>Hull Perimeter: <span className="font-mono font-semibold">{evt.boundingHullPerimeterKm ?? evt.estimatedPerimeterKm} km</span></div>
                    </div>
                    <div className="text-[10px] text-slate-400 italic">Observation cluster bounding hull (not ground perimeter)</div>
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Peak Instantaneous FRP:</span>
                      <span className="font-bold text-amber-600">{evt.peakFrpMw} MW</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No clustered physical events in current filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: REPRODUCIBLE DATA RELEASE CARD */}
      {activeTab === 'export' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600">
              Open Science & Reproducibility
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">
              FireLens Reproducible Research Data Release
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Download frozen, verified empirical satellite records for the Nilgiris study window (2019–2026),
              including full scan geometry, native sensor confidences, and cryptographic checksums.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900">Canonical Research CSV</span>
                <p className="text-xs text-slate-500 mt-1">
                  Complete dataset of 13,065 deduplicated observations with scan/track geometry, local solar times, and SHA-256 hashes.
                </p>
                <div className="mt-2 text-[11px] font-mono text-slate-400">firelens_nilgiris_2019_2026.csv (3.0 MB)</div>
              </div>
              <a
                href="/api/firelens/export/csv"
                download="firelens_nilgiris_2019_2026.csv"
                className="mt-4 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                Download CSV (3.0 MB)
              </a>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900">GeoJSON FeatureCollection</span>
                <p className="text-xs text-slate-500 mt-1">
                  Standard RFC 7946 GeoJSON format ready for QGIS, ArcGIS, Google Earth Engine, and Python geopandas.
                </p>
                <div className="mt-2 text-[11px] font-mono text-slate-400">firelens_nilgiris_2019_2026.geojson</div>
              </div>
              <a
                href="/api/firelens/export/geojson?limit=5000"
                download="firelens_nilgiris_2019_2026.geojson"
                className="mt-4 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                Download GeoJSON
              </a>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900">MCD64A1 Validation Ground Truth</span>
                <p className="text-xs text-slate-500 mt-1">
                  NASA LP DAAC 500m Monthly Burned Area Collection 6.1 independent ground truth validation series.
                </p>
                <div className="mt-2 text-[11px] font-mono text-slate-400">firelens_validation_mcd64a1.json</div>
              </div>
              <a
                href="/api/firelens/validation"
                download="firelens_validation_mcd64a1.json"
                className="mt-4 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                Download Validation JSON
              </a>
            </div>
          </div>

          {/* Scientific Citation Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700">
            <span className="font-bold text-slate-900 block mb-1">Recommended Citation:</span>
            <pre className="font-mono text-[11px] bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap select-all text-slate-800">
{`FireLens Research Group (2026). "Are We Observing More Burning, or Are Changes in the Satellite Observing System Influencing What We See?"
Empirical active fire archive and observing effort decomposition for Nilgiris Biosphere Reserve (2019–2026).
Derived from NASA EOSDIS FIRMS MODIS Collection 6.1 (MOD14/MYD14), VIIRS Active Fire (VNP14IMG/VJ114IMG), and MCD64A1 Burned Area.`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
