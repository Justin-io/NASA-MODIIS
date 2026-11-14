import React, { useMemo, useState } from 'react';
import {
  AgentStatusRecord,
  TemporalEvidenceModality,
} from '../shared/types';
import {
  EVIDENCE_GRAPH_EDGES,
  EVIDENCE_GRAPH_NODES,
  TEMPORAL_EVIDENCE_EVENTS,
} from '../shared/dataAdapter';
import { filterTemporalEvidenceByCutoff } from '../shared/intelligenceEngine';
import { SectionHeader } from '../shared/ui';

interface EvidenceAndAgentsViewProps {
  agents: AgentStatusRecord[];
  onTriggerAgentReevaluation: (agentId: string) => void;
}

function formatCutoffMinutesToUtc(minutesFrom0600: number): string {
  const totalMins = 6 * 60 + minutesFrom0600;
  const hrs = Math.floor(totalMins / 60) % 24;
  const mins = totalMins % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')} UTC`;
}

export const EvidenceAndAgentsView: React.FC<EvidenceAndAgentsViewProps> = ({
  agents,
  onTriggerAgentReevaluation,
}) => {
  const [subMode, setSubMode] = useState<'graph' | 'agents'>('graph');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('EV-HYP-01');
  const [relationFilter, setRelationFilter] = useState<string>('all');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    agents[0]?.id || 'AG-01'
  );

  // Temporal Timeline State
  const [cutoffMinutes, setCutoffMinutes] = useState<number>(310); // 11:10 UTC (full window)
  const [modalityFilter, setModalityFilter] = useState<
    'all' | TemporalEvidenceModality
  >('all');
  const [selectedTemporalEventId, setSelectedTemporalEventId] =
    useState<string>('TEV-05');

  const temporalSlice = useMemo(
    () =>
      filterTemporalEvidenceByCutoff(
        TEMPORAL_EVIDENCE_EVENTS,
        cutoffMinutes,
        modalityFilter
      ),
    [cutoffMinutes, modalityFilter]
  );

  const selectedTemporalEvent =
    temporalSlice.visibleEvents.find((e) => e.id === selectedTemporalEventId) ||
    temporalSlice.visibleEvents[temporalSlice.visibleEvents.length - 1] ||
    null;

  const selectedNode =
    EVIDENCE_GRAPH_NODES.find((n) => n.id === selectedNodeId) ||
    EVIDENCE_GRAPH_NODES[0] ||
    null;

  const visibleEdges = EVIDENCE_GRAPH_EDGES.filter((e) =>
    relationFilter === 'all' ? true : e.relation === relationFilter
  );

  const selectedAgent =
    agents.find((a) => a.id === selectedAgentId) || agents[0];

  const handleSelectTemporalEvent = (
    eventId: string,
    linkedNodeId: string
  ) => {
    setSelectedTemporalEventId(eventId);
    setSelectedNodeId(linkedNodeId);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <SectionHeader
        kicker="Epistemic Graph Reasoning, Chronological Multi-Sensor Timeline & Multi-Agent Operations"
        title="Evidence Investigation Graph & Temporal Telemetry Timeline"
        subtitle="Inspect why ALEX linked multi-satellite detections, field ranger patrols, weather shifts, and incident reports chronologically—and audit every agent's assumptions."
        rightSlot={
          <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSubMode('graph')}
              className={`flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                subMode === 'graph'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Evidence Graph & Timeline
            </button>
            <button
              type="button"
              onClick={() => setSubMode('agents')}
              className={`flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                subMode === 'agents'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Adaptive Agents (9)
            </button>
          </div>
        }
      />

      {subMode === 'graph' ? (
        <div className="space-y-5 sm:space-y-6">
          {/* Top Row: Interactive Evidence Graph + Node Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="p-3 sm:px-4 sm:py-3 bg-[#FAFBFC] border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {(
                    [
                      ['all', 'All Relations'],
                      ['supports', 'Supports'],
                      ['corroborates', 'Corroborates'],
                      ['contradicts', 'Contradicts'],
                      ['threatens', 'Threatens'],
                    ] as const
                  ).map(([rel, lbl]) => (
                    <button
                      key={rel}
                      type="button"
                      onClick={() => setRelationFilter(rel)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 transition-colors ${
                        relationFilter === rel
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-mono text-slate-500 mr-1 hidden sm:inline">
                    Active Window: ≤ {formatCutoffMinutesToUtc(cutoffMinutes)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setZoomScale((z) =>
                        Math.max(0.8, Number((z - 0.1).toFixed(1)))
                      )
                    }
                    className="px-2.5 py-1 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                  >
                    Zoom -
                  </button>
                  <span className="text-xs font-mono text-slate-600 px-1 tabular-nums">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setZoomScale((z) =>
                        Math.min(1.3, Number((z + 0.1).toFixed(1)))
                      )
                    }
                    className="px-2.5 py-1 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                  >
                    Zoom +
                  </button>
                </div>
              </div>

              <svg
                viewBox="0 0 900 480"
                className="w-full h-[290px] sm:h-[420px] bg-[#F8FAFC] block select-none"
                role="img"
                aria-label="Interactive Evidence Graph"
              >
                <g transform={`scale(${zoomScale})`}>
                  {visibleEdges.map((edge) => {
                    const src = EVIDENCE_GRAPH_NODES.find(
                      (n) => n.id === edge.source
                    );
                    const tgt = EVIDENCE_GRAPH_NODES.find(
                      (n) => n.id === edge.target
                    );
                    if (!src || !tgt) return null;

                    const isTemporalActive =
                      temporalSlice.activeNodeIds.includes(src.id) &&
                      temporalSlice.activeNodeIds.includes(tgt.id);

                    const strokeColor =
                      edge.relation === 'contradicts'
                        ? '#e11d48'
                        : edge.relation === 'threatens'
                        ? '#d97706'
                        : edge.relation === 'corroborates'
                        ? '#059669'
                        : '#0284c7';

                    const midX = (src.x + tgt.x) / 2;
                    const midY = (src.y + tgt.y) / 2;

                    return (
                      <g
                        key={edge.id}
                        opacity={isTemporalActive ? 1 : 0.28}
                      >
                        <line
                          x1={src.x}
                          y1={src.y}
                          x2={tgt.x}
                          y2={tgt.y}
                          stroke={strokeColor}
                          strokeWidth="2"
                          strokeDasharray={
                            edge.relation === 'contradicts' ? '5 4' : undefined
                          }
                        />
                        <rect
                          x={midX - 42}
                          y={midY - 9}
                          width="84"
                          height="18"
                          rx="4"
                          fill="#ffffff"
                          stroke={strokeColor}
                          strokeWidth="1"
                        />
                        <text
                          x={midX}
                          y={midY + 3}
                          textAnchor="middle"
                          fontSize="9"
                          fontFamily="JetBrains Mono"
                          fill={strokeColor}
                        >
                          {edge.relation}
                        </text>
                      </g>
                    );
                  })}

                  {EVIDENCE_GRAPH_NODES.map((node) => {
                    const isSelected = selectedNode ? node.id === selectedNode.id : false;
                    const isTemporalObserved =
                      temporalSlice.activeNodeIds.includes(node.id);
                    const borderStroke =
                      node.verification === 'unverified'
                        ? '#e11d48'
                        : node.type === 'hypothesis'
                        ? '#0f172a'
                        : '#0284c7';

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={() => setSelectedNodeId(node.id)}
                        className="cursor-pointer"
                        opacity={isTemporalObserved || isSelected ? 1 : 0.35}
                      >
                        <rect
                          x="-95"
                          y="-28"
                          width="190"
                          height="56"
                          rx="10"
                          fill={isSelected ? '#0f172a' : '#ffffff'}
                          stroke={borderStroke}
                          strokeWidth={isSelected ? 2.5 : 1.5}
                        />
                        <text
                          x="-82"
                          y="-8"
                          fontSize="9.5"
                          fontFamily="JetBrains Mono"
                          fill={isSelected ? '#38bdf8' : '#475569'}
                        >
                          {node.id} · Conf {node.confidencePct}%
                        </text>
                        <text
                          x="-82"
                          y="8"
                          fontSize="10.5"
                          fontWeight="600"
                          fontFamily="Plus Jakarta Sans"
                          fill={isSelected ? '#ffffff' : '#0f172a'}
                        >
                          {node.label.slice(0, 27)}
                        </text>
                        <text
                          x="-82"
                          y="21"
                          fontSize="8.5"
                          fontFamily="JetBrains Mono"
                          fill={isSelected ? '#cbd5e1' : '#64748b'}
                        >
                          {node.sourceRef.slice(0, 28)}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>

            <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              {selectedNode ? (
                <div>
                  <div className="text-xs font-mono text-slate-500">
                    Selected Evidence Node · {selectedNode.id}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mt-1">
                    {selectedNode.label}
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {selectedNode.summary}
                  </p>

                  <div className="grid grid-cols-2 gap-3 my-4 pt-3 border-t border-slate-200/80 font-mono text-xs">
                    <div>
                      <div className="text-[11px] text-slate-500">Confidence</div>
                      <div className="text-base font-bold text-slate-900 tabular-nums">
                        {selectedNode.confidencePct}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">
                        Verification
                      </div>
                      <div className="text-base font-bold text-slate-900 capitalize">
                        {selectedNode.verification}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200/80 pt-3">
                    <div className="text-xs font-semibold text-slate-800 mb-2">
                      Connected Evidentiary Links
                    </div>
                    <div className="space-y-2">
                      {EVIDENCE_GRAPH_EDGES.filter(
                        (e) =>
                          e.source === selectedNode.id ||
                          e.target === selectedNode.id
                      ).map((edge) => (
                        <div
                          key={edge.id}
                          className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs"
                        >
                          <div className="font-mono text-[11px] font-semibold text-slate-800">
                            {edge.source} —[{edge.relation}]→ {edge.target}
                          </div>
                          <div className="text-slate-600 mt-1">
                            {edge.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 mt-4 border-t border-slate-200/80 text-[11px] font-mono text-slate-500">
                    Provenance Reference: {selectedNode.sourceRef}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                    <span className="font-mono text-xs">∅</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-800">No Evidence Node Selected</div>
                  <div className="text-[11px] text-slate-500 max-w-xs mt-1">
                    Graph nodes are established when satellite passes or field reports are ingested.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Temporal Evidence Timeline (Incident Reports, Satellite Observations & Sensor Telemetry) */}
          <div
            data-testid="evidence-temporal-timeline"
            className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <div className="p-4 sm:px-5 sm:py-4 bg-[#FAFBFC] border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
              <div>
                <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-sky-700">
                  Chronological Multi-Sensor Synchronization · 06:00 – 11:10 UTC
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mt-0.5">
                  Interactive Temporal Timeline — Incident Reports, Satellite Observations & Sensor Telemetry
                </h3>
              </div>

              {/* Modality Filter Pills — Non-Clipping Wrap */}
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalityFilter('all')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap transition-colors ${
                    modalityFilter === 'all'
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  All ({temporalSlice.visibleEvents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModalityFilter('incident_report')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap transition-colors ${
                    modalityFilter === 'incident_report'
                      ? 'bg-amber-600 border-amber-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  ▲ Incident Reports ({temporalSlice.modalityCounts.incident_report})
                </button>
                <button
                  type="button"
                  onClick={() => setModalityFilter('satellite_observation')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap transition-colors ${
                    modalityFilter === 'satellite_observation'
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  ◆ Satellite Overpasses ({temporalSlice.modalityCounts.satellite_observation})
                </button>
                <button
                  type="button"
                  onClick={() => setModalityFilter('sensor_telemetry')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border whitespace-nowrap transition-colors ${
                    modalityFilter === 'sensor_telemetry'
                      ? 'bg-sky-600 border-sky-600 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  ● Sensor Telemetry ({temporalSlice.modalityCounts.sensor_telemetry})
                </button>
              </div>
            </div>

            {/* Temporal Horizon Scrubber Bar */}
            <div className="px-4 sm:px-5 py-3 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <label
                  htmlFor="temporal-cutoff-slider"
                  className="text-xs font-medium text-slate-700 whitespace-nowrap"
                >
                  Temporal Replay Cutoff:
                </label>
                <input
                  id="temporal-cutoff-slider"
                  aria-label="Temporal Replay Cutoff"
                  type="range"
                  min={14}
                  max={310}
                  step={8}
                  value={cutoffMinutes}
                  onChange={(e) => setCutoffMinutes(Number(e.target.value))}
                  className="w-full max-w-md"
                />
                <span className="font-mono text-xs font-bold text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg whitespace-nowrap tabular-nums">
                  {formatCutoffMinutesToUtc(cutoffMinutes)}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setCutoffMinutes((m) => Math.max(70, m - 60))
                  }
                  className="px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100"
                >
                  -1h Window
                </button>
                <button
                  type="button"
                  onClick={() => setCutoffMinutes(180)}
                  className="px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100"
                >
                  09:00 UTC Snapshot
                </button>
                <button
                  type="button"
                  onClick={() => setCutoffMinutes(310)}
                  className="px-2.5 py-1.5 text-xs font-mono bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  Live 11:10 UTC
                </button>
              </div>
            </div>

            {/* 3-Lane Chronological Swimlane Visualization + Inspector Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="lg:col-span-8 p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-slate-200/80 space-y-4">
                {/* Multi-Lane SVG Temporal Track */}
                <div className="border border-slate-200/80 rounded-xl bg-[#F8FAFC] p-2 sm:p-3 overflow-x-auto no-scrollbar">
                  <svg
                    viewBox="0 0 780 185"
                    className="w-full min-w-[560px] h-[165px] block select-none"
                    role="img"
                    aria-label="Chronological Evidence Swimlane Chart"
                  >
                    {/* Time Grid Vertical Lines */}
                    {[
                      { min: 0, label: '06:00 UTC' },
                      { min: 60, label: '07:00 UTC' },
                      { min: 120, label: '08:00 UTC' },
                      { min: 180, label: '09:00 UTC' },
                      { min: 240, label: '10:00 UTC' },
                      { min: 300, label: '11:00 UTC' },
                    ].map((tick) => {
                      const tx = 145 + (tick.min / 310) * 605;
                      return (
                        <g key={tick.min}>
                          <line
                            x1={tx}
                            y1={14}
                            x2={tx}
                            y2={155}
                            stroke="#e2e8f0"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={tx}
                            y={173}
                            textAnchor="middle"
                            fontSize="9.5"
                            fontFamily="JetBrains Mono"
                            fill="#64748b"
                          >
                            {tick.label}
                          </text>
                        </g>
                      );
                    })}

                    {/* 3 Horizontal Swimlanes */}
                    {[
                      {
                        y: 38,
                        label: 'Incident Reports',
                        sub: 'Field & EOC Orders',
                        color: '#d97706',
                      },
                      {
                        y: 88,
                        label: 'Satellite Observations',
                        sub: 'MODIS & VIIRS LANCE',
                        color: '#7c3aed',
                      },
                      {
                        y: 138,
                        label: 'Sensor Telemetry',
                        sub: 'MODIS/VIIRS & IoT',
                        color: '#0284c7',
                      },
                    ].map((lane, idx) => (
                      <g key={idx}>
                        <line
                          x1={145}
                          y1={lane.y}
                          x2={755}
                          y2={lane.y}
                          stroke="#cbd5e1"
                          strokeWidth="1.5"
                        />
                        <text
                          x={10}
                          y={lane.y - 3}
                          fontSize="10"
                          fontWeight="600"
                          fontFamily="Plus Jakarta Sans"
                          fill="#0f172a"
                        >
                          {lane.label}
                        </text>
                        <text
                          x={10}
                          y={lane.y + 10}
                          fontSize="8.5"
                          fontFamily="JetBrains Mono"
                          fill="#64748b"
                        >
                          {lane.sub}
                        </text>
                      </g>
                    ))}

                    {/* Active Cutoff Playhead Line */}
                    {(() => {
                      const cutoffX = 145 + (cutoffMinutes / 310) * 605;
                      return (
                        <g>
                          <line
                            x1={cutoffX}
                            y1={10}
                            x2={cutoffX}
                            y2={158}
                            stroke="#0f172a"
                            strokeWidth="2"
                          />
                          <rect
                            x={cutoffX - 28}
                            y={2}
                            width="56"
                            height="14"
                            rx="3"
                            fill="#0f172a"
                          />
                          <text
                            x={cutoffX}
                            y={12}
                            textAnchor="middle"
                            fontSize="8.5"
                            fontFamily="JetBrains Mono"
                            fill="#ffffff"
                          >
                            {formatCutoffMinutesToUtc(cutoffMinutes).replace(
                              ' UTC',
                              'Z'
                            )}
                          </text>
                        </g>
                      );
                    })()}

                    {/* Plot All Temporal Events */}
                    {TEMPORAL_EVIDENCE_EVENTS.map((ev) => {
                      const cx = 145 + (ev.minutesFromStart / 310) * 605;
                      const cy =
                        ev.modality === 'incident_report'
                          ? 38
                          : ev.modality === 'satellite_observation'
                          ? 88
                          : 138;
                      const isWithinCutoff =
                        ev.minutesFromStart <= cutoffMinutes;
                      const isModalityMatch =
                        modalityFilter === 'all' ||
                        ev.modality === modalityFilter;
                      const isSelected =
                        selectedTemporalEvent &&
                        selectedTemporalEvent.id === ev.id;

                      const fillTone =
                        ev.verification === 'unverified'
                          ? '#94a3b8'
                          : ev.modality === 'incident_report'
                          ? '#d97706'
                          : ev.modality === 'satellite_observation'
                          ? '#7c3aed'
                          : '#0284c7';

                      return (
                        <g
                          key={ev.id}
                          transform={`translate(${cx}, ${cy})`}
                          onClick={() =>
                            handleSelectTemporalEvent(ev.id, ev.linkedNodeId)
                          }
                          className="cursor-pointer"
                          opacity={
                            isWithinCutoff && isModalityMatch ? 1 : 0.22
                          }
                        >
                          {isSelected && (
                            <circle
                              r="13"
                              fill={fillTone}
                              fillOpacity="0.18"
                              stroke={fillTone}
                              strokeWidth="1.5"
                            />
                          )}
                          <circle
                            r={isSelected ? 7.5 : 6}
                            fill={fillTone}
                            stroke="#ffffff"
                            strokeWidth="2"
                          />
                          <text
                            x="0"
                            y="-11"
                            textAnchor="middle"
                            fontSize="8.5"
                            fontFamily="JetBrains Mono"
                            fontWeight={isSelected ? '700' : '500'}
                            fill="#0f172a"
                          >
                            {ev.timestampUtc.replace(' UTC', '')}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Chronological Event Cards Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {temporalSlice.visibleEvents.map((ev) => {
                    const isSelected =
                      selectedTemporalEvent &&
                      selectedTemporalEvent.id === ev.id;
                    const badgeTone =
                      ev.modality === 'satellite_observation'
                        ? 'text-purple-700 bg-purple-50 border-purple-200'
                        : ev.modality === 'incident_report'
                        ? 'text-amber-800 bg-amber-50 border-amber-200'
                        : 'text-sky-800 bg-sky-50 border-sky-200';
                    const modalityTag =
                      ev.modality === 'satellite_observation'
                        ? '◆ Satellite Overpass'
                        : ev.modality === 'incident_report'
                        ? '▲ Incident Report'
                        : '● Sensor Telemetry';

                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() =>
                          handleSelectTemporalEvent(ev.id, ev.linkedNodeId)
                        }
                        className={`text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                            : 'bg-white border-slate-200/90 hover:border-slate-300 text-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 text-[11px] font-mono">
                          <span
                            className={
                              isSelected
                                ? 'text-sky-300 font-semibold'
                                : 'text-slate-500 font-semibold'
                            }
                          >
                            {ev.timestampUtc}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded border text-[10px] ${
                              isSelected
                                ? 'bg-slate-800 border-slate-700 text-slate-200'
                                : badgeTone
                            }`}
                          >
                            {modalityTag}
                          </span>
                        </div>
                        <div className="text-xs font-semibold mt-1.5 line-clamp-1">
                          {ev.title}
                        </div>
                        <div
                          className={`text-[11px] font-mono mt-1 flex items-center justify-between ${
                            isSelected ? 'text-slate-300' : 'text-slate-600'
                          }`}
                        >
                          <span>{ev.metricValue}</span>
                          <span>→ {ev.linkedNodeId}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Selected Chronological Event & Radiometric / Sensor Telemetry Inspector */}
              <div className="lg:col-span-4 p-4 sm:p-5 bg-white flex flex-col justify-between">
                {selectedTemporalEvent ? (
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-2 text-xs font-mono">
                      <span className="text-slate-500">
                        {selectedTemporalEvent.id} ·{' '}
                        {selectedTemporalEvent.timestampUtc}
                      </span>
                      <span
                        className={`font-semibold capitalize ${
                          selectedTemporalEvent.verification === 'unverified'
                            ? 'text-rose-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {selectedTemporalEvent.verification} (
                        {selectedTemporalEvent.confidencePct}%)
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
                        {selectedTemporalEvent.title}
                      </h4>
                      <div className="text-xs font-mono text-slate-500 mt-0.5">
                        Source: {selectedTemporalEvent.sourceUnit} · Linked Node:{' '}
                        <span className="text-slate-900 font-semibold">
                          {selectedTemporalEvent.linkedNodeId}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {selectedTemporalEvent.summary}
                    </p>

                    {/* Simulated Radiometric LWIR Thermal Frame / Sensor Readout Box */}
                    <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2.5 font-mono text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1.5">
                        <span>
                          {selectedTemporalEvent.modality === 'satellite_observation'
                            ? 'SATELLITE RADIOMETRIC PAYLOAD TELEMETRY'
                            : selectedTemporalEvent.modality ===
                              'sensor_telemetry'
                            ? 'SENSOR STREAM PAYLOAD'
                            : 'FIELD / STATUTORY VERIFICATION RECORD'}
                        </span>
                        <span className="text-sky-400">
                          {selectedTemporalEvent.coordinates.lat.toFixed(4)}°N,{' '}
                          {selectedTemporalEvent.coordinates.lng.toFixed(4)}°E
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <div className="text-[10px] text-slate-400">
                            {selectedTemporalEvent.metricLabel}
                          </div>
                          <div className="text-sm font-bold text-amber-400 tabular-nums">
                            {selectedTemporalEvent.metricValue}
                          </div>
                        </div>

                        {selectedTemporalEvent.telemetrySnapshot?.peakTempC !==
                          undefined && (
                          <div>
                            <div className="text-[10px] text-slate-400">
                              Peak Thermal Core
                            </div>
                            <div className="text-sm font-bold text-rose-400 tabular-nums">
                              {selectedTemporalEvent.telemetrySnapshot.peakTempC}{' '}
                              °C
                            </div>
                          </div>
                        )}

                        {selectedTemporalEvent.telemetrySnapshot
                          ?.frameResolution && (
                          <div>
                            <div className="text-[10px] text-slate-400">
                              Sensor Optics
                            </div>
                            <div className="text-xs font-semibold text-slate-200">
                              {
                                selectedTemporalEvent.telemetrySnapshot
                                  .frameResolution
                              }
                            </div>
                          </div>
                        )}

                        {selectedTemporalEvent.telemetrySnapshot
                          ?.soilMoisturePct !== undefined && (
                          <div>
                            <div className="text-[10px] text-slate-400">
                              Soil / Fuel Moisture
                            </div>
                            <div className="text-xs font-semibold text-sky-300 tabular-nums">
                              {
                                selectedTemporalEvent.telemetrySnapshot
                                  .soilMoisturePct
                              }
                              % Dielectric
                            </div>
                          </div>
                        )}

                        {selectedTemporalEvent.telemetrySnapshot?.pm25UgM3 !==
                          undefined && (
                          <div>
                            <div className="text-[10px] text-slate-400">
                              Plume Aerosol PM2.5
                            </div>
                            <div className="text-xs font-semibold text-amber-300 tabular-nums">
                              {selectedTemporalEvent.telemetrySnapshot.pm25UgM3}{' '}
                              µg/m³
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="pt-3 mt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Synchronized with Evidence Graph</span>
                  <span>
                    Active Nodes: {temporalSlice.activeNodeIds.length}/{EVIDENCE_GRAPH_NODES.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          <div className="lg:col-span-5 space-y-2.5">
            {agents.map((ag) => {
              const active = ag.id === selectedAgent.id;
              return (
                <button
                  key={ag.id}
                  type="button"
                  onClick={() => setSelectedAgentId(ag.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
                    active
                      ? 'bg-white border-slate-900 ring-1 ring-slate-900'
                      : 'bg-white border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900">
                      {ag.name}
                    </span>
                    <span className="font-mono text-[11px] text-sky-700">
                      {ag.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {ag.specialty}
                  </div>
                  <div className="text-xs text-slate-700 mt-2 line-clamp-2">
                    {ag.currentTask}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 space-y-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-200/80">
              <div>
                <div className="text-xs font-mono text-slate-500">
                  Agent Role #{selectedAgent.id} · {selectedAgent.status}
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mt-0.5">
                  {selectedAgent.name} — {selectedAgent.specialty}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onTriggerAgentReevaluation(selectedAgent.id)}
                className="min-h-[38px] px-3.5 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                Re-Evaluate Hypothesis Cycle
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="font-semibold text-slate-800 mb-1">
                  Latest Acquired Evidence & Output
                </div>
                <p className="text-slate-700 leading-relaxed">
                  {selectedAgent.latestOutput}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl">
                  <div className="font-semibold text-amber-950 mb-1">
                    Remaining Epistemic Uncertainties
                  </div>
                  <p className="text-amber-900 leading-relaxed">
                    {selectedAgent.uncertaintyNote}
                  </p>
                </div>

                <div className="p-4 bg-sky-50/60 border border-sky-200/80 rounded-xl">
                  <div className="font-semibold text-sky-950 mb-1">
                    Recommended Next Operator Action (Advisory Only)
                  </div>
                  <p className="text-sky-900 leading-relaxed">
                    {selectedAgent.recommendedAction}
                  </p>
                </div>
              </div>

              {selectedAgent.invalidatedAssumption && (
                <div className="p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-xl text-rose-950">
                  <span className="font-semibold">
                    Invalidated Prior Assumption:{' '}
                  </span>
                  {selectedAgent.invalidatedAssumption}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200/80">
                <div className="font-semibold text-slate-800 mb-2">
                  Transparent Tool Execution Log (No Autonomous Real-World Dispatch)
                </div>
                <div className="space-y-2">
                  {selectedAgent.executionHistory.map((exec, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                    >
                      <div>
                        <div className="font-mono font-semibold text-slate-900">
                          {exec.toolUsed}
                        </div>
                        <div className="text-slate-600 mt-0.5">
                          {exec.summary}
                        </div>
                      </div>
                      <div className="sm:text-right shrink-0 font-mono text-[11px] text-slate-500">
                        <div>{exec.timestamp}</div>
                        <div className="text-slate-600">
                          {exec.isRecommendationOnly
                            ? 'Prepared Recommendation'
                            : 'Read-Only Analysis'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
