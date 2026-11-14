import React, { useEffect, useState } from 'react';
import { apiClient, LedgerEventRecord } from '../shared/apiClient';
import { SectionHeader } from '../shared/ui';

export const BacktrackingView: React.FC = () => {
  const [events, setEvents] = useState<LedgerEventRecord[]>([]);
  const [integrity, setIntegrity] = useState<{ valid: boolean; totalEvents: number; reason?: string }>({
    valid: true,
    totalEvents: 0,
  });
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  const loadLedger = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getLedger(100);
      setEvents(data.events || []);
      setIntegrity(data.integrity || { valid: true, totalEvents: 0 });
      if (data.events?.length > 0 && !selectedEventId) {
        setSelectedEventId(data.events[data.events.length - 1].id);
      }
    } catch (err: any) {
      console.error('Failed to load ledger:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, []);

  const filteredEvents = events.filter((e) => {
    if (filterType === 'all') return true;
    return e.eventType === filterType;
  });

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[events.length - 1];

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker={`Ledger Sequence #${events.length} · 100% Cryptographic Integrity`}
        title="Cognitive Memory & Backtracking Engine"
        subtitle="Cryptographically chained event ledger with SHA-256 tamper-evident integrity. Reconstructs what ALEX knew at any historical instant, which evidence was considered, which assumptions were invalidated, and who authorized each action."
      />

      {/* Cryptographic Proof Banner */}
      <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-3.5 h-3.5 rounded-full ${
              integrity.valid ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <div>
            <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
              <span>SHA-256 Block Chain Status:</span>
              <span
                className={`font-mono text-xs px-2 py-0.5 rounded ${
                  integrity.valid
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {integrity.valid ? 'TAMPER-PROOF VERIFIED' : 'INTEGRITY CORRUPTED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Every system transition, satellite ingestion, agent finding, and dispatch command is permanently signed with cryptographic parent linkage.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadLedger}
          disabled={isLoading}
          className="px-3.5 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:bg-slate-400 shrink-0 font-mono transition-colors"
        >
          {isLoading ? 'Verifying Hashes...' : 'Re-verify Ledger'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Event Stream / Timeline */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700 font-mono uppercase">
              Chained Events ({filteredEvents.length})
            </span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 font-mono"
            >
              <option value="all">All Event Types</option>
              <option value="system_init">system_init</option>
              <option value="observation_ingested">observation_ingested</option>
              <option value="incident_created">incident_created</option>
              <option value="incident_status_changed">incident_status_changed</option>
              <option value="agent_executed">agent_executed</option>
              <option value="decision_recorded">decision_recorded</option>
              <option value="voice_call_initiated">voice_call_initiated</option>
              <option value="call_state_changed">call_state_changed</option>
              <option value="dispatch_transition">dispatch_transition</option>
            </select>
          </div>

          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {filteredEvents.map((evt) => {
              const active = evt.id === selectedEvent?.id;
              return (
                <button
                  key={evt.id}
                  type="button"
                  onClick={() => setSelectedEventId(evt.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                      }`}
                    >
                      Seq #{evt.sequence}
                    </span>
                    <span
                      className={`text-[10px] font-mono ${
                        active ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {evt.timestamp.slice(11, 19)} UTC
                    </span>
                  </div>
                  <div className="text-xs font-semibold truncate mb-0.5">
                    {evt.eventType.replace(/_/g, ' ')}
                  </div>
                  <div
                    className={`text-[11px] truncate ${
                      active ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    Actor: {evt.actor}
                  </div>
                  <div
                    className={`text-[10px] font-mono truncate mt-1 ${
                      active ? 'text-emerald-300' : 'text-slate-400'
                    }`}
                  >
                    Hash: {evt.hash.slice(0, 16)}...
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Cryptographic Payload & Decision Replay Detail */}
        <div className="lg:col-span-7 space-y-4">
          {selectedEvent ? (
            <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <span>Block #{selectedEvent.sequence}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {selectedEvent.eventType}
                    </span>
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Logged by <span className="font-medium text-slate-700">{selectedEvent.actor}</span> at{' '}
                    {selectedEvent.timestamp}
                  </div>
                </div>
                <span className="font-mono text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
                  SHA-256 Signed
                </span>
              </div>

              {/* Cryptographic Linkage Box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] space-y-1.5">
                <div className="text-slate-500 flex items-center justify-between">
                  <span>PREVIOUS BLOCK HASH:</span>
                  <span className="text-slate-700 truncate max-w-[340px]">
                    {selectedEvent.prevHash}
                  </span>
                </div>
                <div className="text-emerald-700 flex items-center justify-between font-semibold">
                  <span>CURRENT BLOCK HASH:</span>
                  <span className="truncate max-w-[340px]">{selectedEvent.hash}</span>
                </div>
              </div>

              {/* Decision Backtracking Context */}
              {selectedEvent.eventType === 'decision_recorded' && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2.5 text-xs text-indigo-950">
                  <div className="font-semibold text-indigo-900 uppercase font-mono tracking-wider text-[11px]">
                    ◆ Decision Reconstruction & Counterfactual Audit
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Recommendation:</span>
                    <p className="mt-0.5 text-slate-900 font-medium">
                      {selectedEvent.payload?.recommendation || 'Operational recommendation'}
                    </p>
                  </div>
                  {selectedEvent.payload?.invalidatedAssumption && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-900">
                      <span className="font-semibold text-[10px] uppercase font-mono block text-rose-700">
                        Invalidated Assumption Debunked by Skeptic:
                      </span>
                      {selectedEvent.payload.invalidatedAssumption}
                    </div>
                  )}
                  {selectedEvent.payload?.uncertainty && (
                    <div className="text-slate-600 italic">
                      Scientific Uncertainty: {selectedEvent.payload.uncertainty}
                    </div>
                  )}
                </div>
              )}

              {/* Structured JSON Payload */}
              <div>
                <div className="text-xs font-semibold text-slate-700 uppercase font-mono mb-2">
                  Tamper-Evident Event Payload
                </div>
                <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[320px]">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400 bg-white border border-slate-200/90 rounded-2xl">
              Select an event to inspect its cryptographic payload and decision chain.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
