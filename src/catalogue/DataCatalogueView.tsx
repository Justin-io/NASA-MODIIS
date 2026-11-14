import React, { useState } from 'react';
import { DataSourceCatalogueRecord } from '../shared/types';
import { REGISTERED_DATA_SOURCES } from '../shared/catalogData';
import { Card, SectionHeader } from '../shared/ui';
import {
  CheckCircle,
  Database,
  ExternalLink,
  Filter,
  Flame,
  Globe2,
  Info,
  Layers,
  Radio,
  Search,
  Shield,
  WifiOff,
} from 'lucide-react';

export const DataCatalogueView: React.FC = () => {
  const [sources, setSources] = useState<DataSourceCatalogueRecord[]>(
    REGISTERED_DATA_SOURCES
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    { id: 'all', label: 'All Sources (18)' },
    { id: 'active_fire', label: 'Active Fire' },
    { id: 'optical', label: 'Optical Multispectral' },
    { id: 'radar_sar', label: 'Radar SAR' },
    { id: 'burned_area', label: 'Burned Area' },
    { id: 'meteorology', label: 'Meteorology' },
    { id: 'ground_field', label: 'Ground & Field' },
  ];

  const filteredSources = sources.filter((s) => {
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.agency.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.sensorFamily.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.productCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getStatusBadge = (status: DataSourceCatalogueRecord['status']) => {
    switch (status) {
      case 'OPERATIONAL':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            OPERATIONAL
          </span>
        );
      case 'DEMONSTRATION':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Info className="w-3 h-3 text-amber-600" />
            DEMONSTRATION
          </span>
        );
      case 'REQUIRES_API_KEY':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-100 text-sky-800 border border-sky-200">
            REQUIRES MAP_KEY
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="ALEX DATA & RESOURCE CATALOGUE — 18+ EARTH OBSERVATION SOURCES"
        title="Comprehensive Earth Observation, Atmospheric & Field Telemetry Registry"
        subtitle="Provider-independent inventory tracking spatial resolution, latency, licensing, authentication requirements, and live pipeline status."
        action={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-xs font-mono font-medium border border-sky-200">
            <Database className="w-3.5 h-3.5" />
            18 REGISTERED SOURCES • ZERO MOCK POLICY
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === c.id
                  ? 'bg-sky-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search provider, sensor, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSources.map((src) => (
          <Card key={src.id} className="p-5 border-slate-200 bg-white shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wide font-semibold">
                  {src.agency}
                </span>
                {getStatusBadge(src.status)}
              </div>

              <h3 className="text-sm font-bold text-slate-900 leading-snug">{src.name}</h3>
              <div className="text-xs font-mono text-slate-600">{src.productCode}</div>

              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Resolution:</span>
                  <span className="font-medium text-slate-800 text-right">{src.spatialResolution}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Revisit / Cadence:</span>
                  <span className="font-medium text-slate-800 text-right">{src.temporalResolution}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Latency:</span>
                  <span className="font-mono text-slate-800">{src.latency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Coverage:</span>
                  <span className="font-medium text-slate-800 text-right">{src.geographicCoverage}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Licensing:</span> {src.licensing}
              </div>
              <div className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Auth:</span> {src.authRequirements}
              </div>

              <a
                href={src.apiDocUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full mt-2 py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-sky-700 flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Documentation & API Specs</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
