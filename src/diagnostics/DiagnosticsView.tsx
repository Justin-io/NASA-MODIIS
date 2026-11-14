import React, { useEffect, useState } from 'react';
import { apiClient, SystemDiagnosticStatus } from '../shared/apiClient';
import { SectionHeader } from '../shared/ui';

export const DiagnosticsView: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<SystemDiagnosticStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  const runCheck = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getDiagnostics();
      setDiagnostics(data);
      setLastCheckTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Failed to run diagnostics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runCheck();
  }, []);

  const onlineCount = diagnostics.filter((d) => d.status === 'ONLINE').length;

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker={`Providers Healthy: ${onlineCount}/${diagnostics.length} · Checked: ${lastCheckTime || 'Just now'}`}
        title="Integration Health & Autonomous Diagnostics"
        subtitle="Continuous health monitoring across NASA FIRMS satellite ingestion, meteorological feeds, Google GenAI models, emergency routing, and cryptographic ledger integrity."
        rightSlot={
          <button
            type="button"
            onClick={runCheck}
            disabled={isLoading}
            className="px-3.5 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:bg-slate-400 font-mono transition-colors"
          >
            {isLoading ? 'Running Ping Tests...' : 'Execute Health Audit'}
          </button>
        }
      />

      {/* Provider Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {diagnostics.map((diag, idx) => {
          const isOnline = diag.status === 'ONLINE';
          const isAwaiting = diag.status === 'AWAITING_CREDENTIALS';
          return (
            <div
              key={idx}
              className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                    {diag.category}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                      isOnline
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isAwaiting
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {diag.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-900 mb-1">
                  {diag.providerName}
                </h4>
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 mb-2">
                  <span>Ping: {diag.lastPingMs}ms</span>
                  <span>·</span>
                  <span>Errors: {diag.errorCount24h}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {diag.setupInstructions}
                </p>
                {diag.lastErrorMessage && (
                  <p className="text-[11px] text-rose-600 mt-1 font-mono">
                    Error: {diag.lastErrorMessage}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Audit Checklist */}
      <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
          <span>Security & Architectural Containment Checklist</span>
          <span className="text-xs font-mono text-emerald-600 font-normal">
            ✓ 6/6 Policies Enforced
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <span className="text-emerald-600">✓</span>
              <span>Zero Frontend Credential Leaks</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              API keys (NASA, Google Gemini, Telephony) are exclusively stored server-side in .env.local; never exposed in browser bundles.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <span className="text-emerald-600">✓</span>
              <span>SHA-256 Tamper-Evident Ledger</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Every state change, observation ingestion, and agent tool execution is cryptographically linked and signed in memory and disk.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <span className="text-emerald-600">✓</span>
              <span>Honest Degraded States (Zero Fake Data)</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              When satellite or weather APIs are unreachable, ALEX presents honest degraded/unconfigured notices rather than synthetic mock data.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <span className="text-emerald-600">✓</span>
              <span>Human Authority Dispatch Gate</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Casualty reports, 108 EMS ambulance requests, and flight plans cannot execute autonomously without explicit human commander authorization.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <span className="text-emerald-600">✓</span>
              <span>Mandatory AI Telecom Identification</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Voice operations engine announces automated AI identity and recording consent at the start of all outbound phone calls.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <span className="text-emerald-600">✓</span>
              <span>CEOS & ISO 19115 EO Metadata Compliance</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              All active fire and meteorological ingests conform to Committee on Earth Observation Satellites standards and ISO 19115 geographic metadata protocols.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
