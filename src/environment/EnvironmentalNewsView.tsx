import React, { useEffect, useRef, useState } from 'react';
import {
  ClaimVerificationStatus,
  NewsIntelligenceItem,
  WeatherStationSnapshot,
} from '../shared/types';
import {
  formatClaimStatus,
  ProvenanceNoticeBanner,
  SectionHeader,
} from '../shared/ui';

interface EnvironmentalNewsViewProps {
  mode: 'environment' | 'news';
  weatherSnapshots: WeatherStationSnapshot[];
  newsItems: NewsIntelligenceItem[];
  onInspectIncident: (incidentId: string) => void;
}

export const EnvironmentalNewsView: React.FC<EnvironmentalNewsViewProps> = ({
  mode,
  weatherSnapshots,
  newsItems,
  onInspectIncident,
}) => {
  const [selectedStationId, setSelectedStationId] = useState(
    weatherSnapshots[0]?.stationId || 'AWS-NIL-SIGUR-01'
  );
  const [claimFilter, setClaimFilter] = useState<'all' | ClaimVerificationStatus>('all');
  const [selectedNewsItem, setSelectedNewsItem] = useState<NewsIntelligenceItem | null>(
    newsItems[0] || null
  );
  const windCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeWeather =
    weatherSnapshots.find((w) => w.stationId === selectedStationId) ||
    weatherSnapshots[0];

  useEffect(() => {
    if (mode !== 'environment' || !activeWeather) return;
    const canvas = windCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles = Array.from({ length: 36 }, (_, i) => ({
      x: (i * 23) % 520,
      y: (i * 39) % 160,
      speed: 1.4 + (i % 3) * 0.45,
      len: 16 + (i % 4) * 5,
    }));

    let animId = 0;
    const renderParticles = () => {
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < canvas.width; gx += 65) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, canvas.height);
        ctx.stroke();
      }

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      particles.forEach((p) => {
        p.x -= p.speed * (activeWeather.windSpeedKmh / 28);
        p.y += p.speed * 0.35;
        if (p.x < 0) p.x = canvas.width;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.len, p.y - p.len * 0.35);
        ctx.stroke();
      });

      animId = window.setTimeout(renderParticles, 50);
    };

    renderParticles();
    return () => clearTimeout(animId);
  }, [mode, activeWeather]);

  if (mode === 'environment') {
    if (!activeWeather) {
      return (
        <div className="space-y-5">
          <ProvenanceNoticeBanner
            modeLabel="Live environmental telemetry unavailable"
            detail="No weather observation is loaded for this region. Select another view or refresh the live weather feed; missing values are not replaced with simulated readings."
          />
          <SectionHeader
            kicker="Live Open-Meteo Weather Feed"
            title="Environmental & Meteorological Intelligence"
            subtitle="Wind, humidity, temperature, and forecast data will appear here when a current provider response is available."
          />
          <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
            No weather stations are currently available. ALEX will not infer local weather conditions from unrelated data.
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-5 sm:space-y-6">
        <ProvenanceNoticeBanner
          modeLabel="Simulated Ridge Meteorology & Fuel Telemetry"
          detail={`Source: ${activeWeather.source} · Observed: ${activeWeather.observedAt.slice(11, 16)} UTC (Freshness: ${activeWeather.freshnessMinutes} min ago)`}
        />

        <SectionHeader
          kicker="Atmospheric Boundary Layer, Soil Moisture & Vegetation Dryness"
          title="Environmental & Meteorological Intelligence"
          subtitle="Live and historical micro-climate parameters governing wildfire ignition probability, plume transport, and suppression window timing."
          rightSlot={
            <select
              aria-label="Select Weather Telemetry Station"
              value={selectedStationId}
              onChange={(e) => setSelectedStationId(e.target.value)}
              className="w-full sm:w-auto min-h-[40px] px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-medium"
            >
              {weatherSnapshots.map((st) => (
                <option key={st.stationId} value={st.stationId}>
                  {st.stationId} — {st.regionName}
                </option>
              ))}
            </select>
          }
        />

        {activeWeather.warningText && (
          <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-950">
            <div>
              <span className="font-mono font-semibold">
                ▲ Meteorological Warning:{' '}
              </span>
              <span>{activeWeather.warningText}</span>
            </div>
            <span className="font-mono text-[11px] text-amber-800 shrink-0">
              Window: {activeWeather.forecastWindow}
            </span>
          </div>
        )}

        {/* Primary Telemetry Cards — 2 cols on mobile, 3 on tablet, 6 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="text-xs text-slate-500">Air Temperature</div>
            <div className="mt-1 text-xl sm:text-2xl font-mono font-bold text-slate-900 tabular-nums">
              {activeWeather.temperatureC}
              <span className="text-xs font-mono text-slate-400 ml-1">°C</span>
            </div>
            <div className="text-[11px] font-mono text-amber-700 mt-1">
              ▲ +3.2°C vs norm
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="text-xs text-slate-500">Relative Humidity</div>
            <div className="mt-1 text-xl sm:text-2xl font-mono font-bold text-slate-900 tabular-nums">
              {activeWeather.humidityPct}
              <span className="text-xs font-mono text-slate-400 ml-1">%</span>
            </div>
            <div className="text-[11px] font-mono text-rose-700 mt-1">
              Critical (&lt;25%)
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="text-xs text-slate-500">Sustained Wind</div>
            <div className="mt-1 text-xl sm:text-2xl font-mono font-bold text-slate-900 tabular-nums">
              {activeWeather.windSpeedKmh}
              <span className="text-xs font-mono text-slate-400 ml-1">
                km/h {activeWeather.windCompass}
              </span>
            </div>
            <div className="text-[11px] font-mono text-orange-700 mt-1">
              Gusts: {activeWeather.windGustKmh} km/h
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="text-xs text-slate-500">Fuel Dryness Index</div>
            <div className="mt-1 text-xl sm:text-2xl font-mono font-bold text-slate-900 tabular-nums">
              {activeWeather.fuelDrynessPct}
              <span className="text-xs font-mono text-slate-400 ml-1">/100</span>
            </div>
            <div className="text-[11px] font-mono text-rose-700 mt-1">
              Cured Lantana
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="text-xs text-slate-500">Soil Moisture</div>
            <div className="mt-1 text-xl sm:text-2xl font-mono font-bold text-slate-900 tabular-nums">
              {activeWeather.soilMoisturePct}
              <span className="text-xs font-mono text-slate-400 ml-1">%</span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1">
              24h Rain: {activeWeather.rainfallMm24h} mm
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="text-xs text-slate-500">Dry Lightning</div>
            <div className="mt-1 text-xl sm:text-2xl font-mono font-bold text-slate-900 tabular-nums">
              {activeWeather.lightningStrikes1h}
              <span className="text-xs font-mono text-slate-400 ml-1">/1h</span>
            </div>
            <div className="text-[11px] font-mono text-sky-700 mt-1">
              Rain Prob: {activeWeather.precipProbabilityPct}%
            </div>
          </div>
        </div>

        {/* Wind-Flow Streamline Canvas + Diurnal Trend Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Ridge Wind-Flow Vector Field ({activeWeather.windCompass}{' '}
                  {activeWeather.windDirectionDeg}°)
                </h3>
                <p className="text-xs text-slate-500">
                  Simulated boundary-layer streamline transport toward WSW escarpment
                </p>
              </div>
              <span className="text-xs font-mono text-sky-700 shrink-0">
                {activeWeather.windSpeedKmh} km/h
              </span>
            </div>

            <canvas
              ref={windCanvasRef}
              width={520}
              height={160}
              className="w-full h-36 sm:h-40 rounded-xl border border-slate-200/80"
            />

            <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600 font-mono">
              <span>Obs: {activeWeather.observedAt.slice(11, 16)} UTC</span>
              <span>Plume Bearing: 245° WSW</span>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  12-Hour Diurnal Temperature, Wind & Humidity Trajectory
                </h3>
                <p className="text-xs text-slate-500">
                  Peak fire weather window persists 10:00–15:30 UTC
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500 shrink-0">
                {activeWeather.stationId}
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="w-full text-left border-collapse min-w-[360px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600">
                    <th className="py-2 px-3">UTC Hour</th>
                    <th className="py-2 px-3 text-right">Temp (°C)</th>
                    <th className="py-2 px-3 text-right">Wind (km/h)</th>
                    <th className="py-2 px-3 text-right">Humidity (%)</th>
                    <th className="py-2 px-3 text-right">Precip (mm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 text-xs font-mono">
                  {activeWeather.hourlyTrend.map((hr) => (
                    <tr key={hr.hour} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {hr.hour}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-800">
                        {hr.tempC.toFixed(1)}
                      </td>
                      <td className="py-2 px-3 text-right text-sky-700 font-semibold">
                        {hr.windKmh}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700">
                        {hr.humidityPct}%
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-700">
                        {hr.rainMm}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Live News & Situational Awareness Mode
  const filteredNews = newsItems.filter((item) =>
    claimFilter === 'all' ? true : item.verificationStatus === claimFilter
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <ProvenanceNoticeBanner
        modeLabel="Situational Awareness & Claim Verification Feed"
        detail="Visually separates Verified Official Alerts, Independently Corroborated Reports, Unverified Claims, and ALEX Modelled Syntheses."
      />

      <SectionHeader
        kicker="Geographically Grounded Intelligence & Claim Extraction"
        title="Live News, Official Alerts & Field Situational Awareness"
        subtitle="Inspect source credibility, duplicate story clusters, and corroborating or contradicting satellite/field evidence."
        rightSlot={
          <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
            {(
              [
                ['all', 'All Items'],
                ['verified_official', '◆ Official'],
                ['independently_corroborated', '● Corroborated'],
                ['unverified_claim', '△ Unverified'],
                ['ai_interpretation', '◇ AI Synthesis'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setClaimFilter(val)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                  claimFilter === val
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        <div className="lg:col-span-7 space-y-3">
          {filteredNews.map((item) => {
            const st = formatClaimStatus(item.verificationStatus);
            const isSelected = selectedNewsItem?.id === item.id;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedNewsItem(item)}
                className={`bg-white border rounded-2xl p-4 sm:p-5 cursor-pointer transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
                  isSelected
                    ? 'border-slate-900 ring-1 ring-slate-900'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className={`font-semibold ${st.toneClass}`}>
                    {st.glyph} {st.label}
                  </span>
                  <div className="flex items-center gap-2 font-mono text-slate-500">
                    <span>Credibility: {item.credibilityScore}%</span>
                    <span>·</span>
                    <span>
                      {item.duplicateGroupCount > 1
                        ? `Grouped (${item.duplicateGroupCount})`
                        : 'Single Source'}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm sm:text-base font-semibold text-slate-900 mt-1.5 leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {item.excerpt}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-200/70 text-xs text-slate-500">
                  <div>
                    <span className="font-medium text-slate-800">
                      {item.sourceName}
                    </span>
                    <span> · {item.locationName}</span>
                  </div>
                  <div className="font-mono text-[11px]">
                    Event: {item.eventTimestamp.slice(11, 16)} UTC
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-5">
          {selectedNewsItem ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 sticky top-18 space-y-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="pb-3 border-b border-slate-200/80">
                <div className="text-xs font-mono text-slate-500">
                  Evidence & Claim Verification Drawer · {selectedNewsItem.id}
                </div>
                <h3 className="text-base font-semibold text-slate-900 mt-1">
                  {selectedNewsItem.title}
                </h3>
                <div className="text-xs text-slate-600 mt-1">
                  Source:{' '}
                  <span className="font-medium">
                    {selectedNewsItem.sourceName}
                  </span>{' '}
                  ({selectedNewsItem.sourceType})
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-800">
                  Extracted Factual Claims & Cross-Corroboration
                </div>
                {selectedNewsItem.extractedClaims.map((claim, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs"
                  >
                    <div className="font-medium text-slate-900">
                      “{claim.claimText}”
                    </div>
                    <div className="font-mono text-[11px] text-slate-600">
                      Assessed Confidence:{' '}
                      <span className="font-semibold">{claim.confidence}</span>
                    </div>

                    {claim.corroboratedBy.length > 0 && (
                      <div className="text-emerald-800">
                        <span className="font-semibold">
                          ◆ Corroborated By:{' '}
                        </span>
                        {claim.corroboratedBy.join(' · ')}
                      </div>
                    )}

                    {claim.contradictedBy.length > 0 && (
                      <div className="text-rose-800">
                        <span className="font-semibold">
                          ✖ Contradicted By:{' '}
                        </span>
                        {claim.contradictedBy.join(' · ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selectedNewsItem.relatedIncidentId && (
                <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-slate-600">
                    Incident: {selectedNewsItem.relatedIncidentId}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onInspectIncident(selectedNewsItem.relatedIncidentId!)
                    }
                    className="min-h-[38px] px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800"
                  >
                    Open Incident Dossier →
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
