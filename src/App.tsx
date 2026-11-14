/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  ADAPTIVE_AGENTS,
  EMERGENCY_ROUTES,
  INITIAL_ADVISORIES,
  INITIAL_AGENCY_TASKS,
  INITIAL_CASUALTY_REPORTS,
  INITIAL_INCIDENTS,
  INITIAL_RESOURCES,
  MONITORED_REGIONS,
  MonitoredRegion,
  NEWS_FEED_ITEMS,
  WEATHER_SNAPSHOTS,
} from './shared/dataAdapter';
import {
  AgencyTask,
  DispatchWorkflowState,
  IncidentRecord,
  VerificationLevel,
  WeatherStationSnapshot,
} from './shared/types';
import { CommandDashboardView } from './dashboard/CommandDashboardView';
import { IncidentIntelligenceView } from './incidents/IncidentIntelligenceView';
import { EnvironmentalNewsView } from './environment/EnvironmentalNewsView';
import { EvidenceAndAgentsView } from './evidence/EvidenceAndAgentsView';
import { RoutingAndCasualtyView } from './routing/RoutingAndCasualtyView';
import { OperationsAndSimulationView } from './missions/OperationsAndSimulationView';
import { VoiceAssistantAndPalette } from './voice/VoiceAssistantAndPalette';
import { VoiceOperationsView } from './voice/VoiceOperationsView';
import { BacktrackingView } from './memory/BacktrackingView';
import { SelfLearningView } from './learning/SelfLearningView';
import { DiagnosticsView } from './diagnostics/DiagnosticsView';
import { OrbitalIntelligenceView } from './orbital/OrbitalIntelligenceView';
import { BurningActivityCalendarView } from './fire/BurningActivityCalendarView';
import { FireLensResearchView } from './fire/FireLensResearchView';
import { CommunityOperationsView } from './community/CommunityOperationsView';
import { DataCatalogueView } from './catalogue/DataCatalogueView';
import { SettingsAndAccessView } from './settings/SettingsAndAccessView';
import { apiClient, TelephonyCallRecord } from './shared/apiClient';
import { UserRole } from './shared/types';
import { getRoleProfileData } from './shared/accessControlData';

type WorkspaceTab =
  | 'dashboard'
  | 'fire'
  | 'orbital'
  | 'incidents'
  | 'environment'
  | 'news'
  | 'evidence'
  | 'routing'
  | 'voice'
  | 'resources'
  | 'community'
  | 'simulation'
  | 'backtracking'
  | 'learning'
  | 'catalogue'
  | 'diagnostics'
  | 'reports'
  | 'settings';

const SIDEBAR_GROUPS: {
  groupTitle: string;
  items: { id: WorkspaceTab; label: string }[];
}[] = [
  {
    groupTitle: 'NASA Space Apps Research Workspaces',
    items: [
      { id: 'dashboard', label: '1. Observation Explorer (AOI)' },
      { id: 'incidents', label: '2. Harmonisation Laboratory' },
      { id: 'fire', label: '3. Burning Activity Calendar' },
      { id: 'orbital', label: '4. Observation Bias & Orbit' },
      { id: 'evidence', label: '5. Validation & Evidence' },
    ],
  },
  {
    groupTitle: 'Environmental Feeds & Learning',
    items: [
      { id: 'environment', label: 'NWP Weather Grid' },
      { id: 'news', label: 'GDELT Situational News' },
      { id: 'simulation', label: 'Physical Fire Spread Model' },
      { id: 'learning', label: 'Benchmark & Self-Learning' },
      { id: 'backtracking', label: 'Cryptographic Ledger Audit' },
    ],
  },
  {
    groupTitle: 'Operations & Response',
    items: [
      { id: 'routing', label: 'Corridor Routing & EMS' },
      { id: 'voice', label: 'Telephony Carrier Gateway' },
      { id: 'resources', label: 'Resource Asset Tracking' },
      { id: 'community', label: 'Community & Field Reports' },
    ],
  },
  {
    groupTitle: 'Platform & Governance',
    items: [
      { id: 'catalogue', label: 'Earth Observation Catalogue' },
      { id: 'diagnostics', label: 'Provider Diagnostics' },
      { id: 'reports', label: 'ICS Situation Packages' },
      { id: 'settings', label: 'RBAC Security & Secrets' },
    ],
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileModulesOpen, setMobileModulesOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<MonitoredRegion>(
    MONITORED_REGIONS[0]
  );
  const [incidents, setIncidents] = useState<IncidentRecord[]>(INITIAL_INCIDENTS);
  const [weatherSnapshots, setWeatherSnapshots] = useState<WeatherStationSnapshot[]>(WEATHER_SNAPSHOTS);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(
    INITIAL_INCIDENTS[0]?.id || ''
  );
  const [agents, setAgents] = useState(ADAPTIVE_AGENTS);
  const [casualtyReports, setCasualtyReports] = useState(
    INITIAL_CASUALTY_REPORTS
  );
  const [agencyTasks, setAgencyTasks] = useState(INITIAL_AGENCY_TASKS);
  const [resources, setResources] = useState(INITIAL_RESOURCES);
  const [routes, setRoutes] = useState(EMERGENCY_ROUTES);
  const [advisories, setAdvisories] = useState(INITIAL_ADVISORIES);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [calls, setCalls] = useState<TelephonyCallRecord[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole>('commander');

  const fetchBackendState = () => {
    apiClient
      .getFullState()
      .then((state) => {
        if (state) {
          setIncidents(state.incidents || []);
          if (state.incidents?.length) {
            setSelectedIncidentId((prev) => prev || state.incidents[0].id);
          }
          if (state.agents?.length) setAgents(state.agents);
          setCasualtyReports(state.casualtyReports || []);
          setAgencyTasks(state.agencyTasks || []);
          setResources(state.resources || []);
          setRoutes(state.routes || []);
          setAdvisories(state.advisories || []);
          setCalls(state.calls || []);
        }
      })
      .catch((err) => console.log('Local client operational state active:', err.message));
  };

  useEffect(() => {
    fetchBackendState();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ lat: String(selectedRegion.center.lat), lng: String(selectedRegion.center.lng), name: selectedRegion.name, stationId: `REGIONAL-${selectedRegion.id}` });
    fetch(`/api/weather?${params}`).then(async (response) => {
      if (!response.ok) throw new Error(`Weather feed HTTP ${response.status}`);
      return response.json();
    }).then((result) => {
      if (!cancelled) setWeatherSnapshots(Array.isArray(result) ? result : [result]);
    }).catch(() => { if (!cancelled) setWeatherSnapshots([]); });
    return () => { cancelled = true; };
  }, [selectedRegion.id]);

  // Keyboard shortcut Ctrl/Cmd + K for Command Palette
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsPaletteOpen(false);
        setMobileModulesOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleUpdateIncidentStatus = async (
    id: string,
    nextStatus: VerificationLevel
  ) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, status: nextStatus } : inc))
    );
    try {
      await apiClient.updateIncidentStatus(id, nextStatus);
    } catch (err: any) {
      console.warn('Backend update deferred:', err.message);
    }
  };

  const handleCreatePinnedIncident = (
    newIncident: IncidentRecord,
    navigateToIntelligence: boolean = true
  ) => {
    setIncidents((prev) => [newIncident, ...prev]);
    setSelectedIncidentId(newIncident.id);
    const matchedReg = MONITORED_REGIONS.find(
      (r) => r.id === newIncident.region
    );
    if (matchedReg) {
      setSelectedRegion(matchedReg);
    }
    if (navigateToIntelligence) {
      setActiveTab('incidents');
    }
  };

  const handleAcknowledgeAuthorityTask = (taskId: string) => {
    setAgencyTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const nextStatus: AgencyTask['status'] =
          t.status === 'Proposed by ALEX'
            ? 'Assigned'
            : t.status === 'Assigned'
            ? 'In Progress'
            : 'Completed';
        return { ...t, status: nextStatus };
      })
    );
  };

  const handleAddAgencyTask = (
    agency: AgencyTask['agency'],
    title: string,
    owner: string
  ) => {
    const newTask: AgencyTask = {
      id: `TASK-0${agencyTasks.length + 1}`,
      agency,
      title,
      owner,
      status: 'Assigned',
      timestamp: '11:16 UTC',
      notes: 'Logged by Command Operator.',
    };
    setAgencyTasks((prev) => [newTask, ...prev]);
  };

  const handleUpdateCasualtyDispatch = async (
    reportId: string,
    nextState: DispatchWorkflowState,
    authorizedConfirmed: boolean
  ) => {
    setCasualtyReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              dispatchState: nextState,
              authorizedIntegrationConfirmed: authorizedConfirmed,
            }
          : r
      )
    );
    try {
      await apiClient.updateCasualtyDispatch(reportId, nextState, authorizedConfirmed);
    } catch (err: any) {
      console.warn('Backend dispatch update deferred:', err.message);
    }
  };

  const handleTriggerAgentReevaluation = async (agentId: string) => {
    try {
      const res = await apiClient.executeAgent({
        agentId,
        incidentId: selectedIncidentId,
      });
      setAgents((prev) =>
        prev.map((ag) =>
          ag.id === agentId
            ? {
                ...ag,
                status: 'Active Monitoring',
                latestOutput: res.summary,
                recommendedAction: res.recommendedAction,
                uncertaintyNote: res.uncertaintyNotes,
                invalidatedAssumption: res.invalidatedAssumption,
                executionHistory: [
                  {
                    timestamp: new Date().toISOString().slice(11, 19) + ' UTC',
                    toolUsed: res.toolUsed,
                    summary: res.summary,
                    isRecommendationOnly: true,
                  },
                  ...ag.executionHistory,
                ],
              }
            : ag
        )
      );
    } catch (err: any) {
      console.warn('Agent reevaluation execution deferred:', err.message);
    }
  };

  const handleAssignResource = (
    resourceId: string,
    incidentId: string | null
  ) => {
    setResources((prev) =>
      prev.map((res) =>
        res.id === resourceId
          ? {
              ...res,
              assignedIncidentId: incidentId,
              operationalStatus: incidentId ? 'Assigned' : 'Available',
            }
          : res
      )
    );
  };

  const handleCalculateRoute = async (params: Parameters<typeof apiClient.calculateEmergencyRoute>[0]) => {
    const route = await apiClient.calculateEmergencyRoute(params);
    setRoutes((previous) => [route, ...previous.filter((item) => item.id !== route.id)]);
  };

  const handleBroadcastAdvisory = (advisoryId: string) => {
    setAdvisories((prev) =>
      prev.map((adv) =>
        adv.id === advisoryId
          ? {
              ...adv,
              status: 'Broadcast Active',
              deliveredPct: 92,
              acknowledgedPct: 64,
            }
          : adv
      )
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFC] text-slate-900 overflow-x-hidden">
      {/* Strict 3-Zone Top Navigation Bar Contract — Responsive on Mobile (390px) & Desktop (1440px) */}
      <header className="sticky top-0 z-30 h-13 sm:h-14 bg-white/95 border-b border-slate-200/90 px-3.5 sm:px-6 flex items-center justify-between gap-3 sm:gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('dashboard');
          }}
          className="text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          ALEX Environmental Command
        </a>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav
          aria-label="Primary Workspace Navigation"
          className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600"
        >
          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('dashboard');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'dashboard'
                ? 'text-slate-900 underline underline-offset-4'
                : ''
            }`}
          >
            Command
          </a>
          <a
            href="#incidents"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('incidents');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'incidents'
                ? 'text-slate-900 underline underline-offset-4'
                : ''
            }`}
          >
            Incidents
          </a>
          <a
            href="#fire"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('fire');
            }}
            className={`transition-colors whitespace-nowrap shrink-0 font-semibold ${
              activeTab === 'fire'
                ? 'text-amber-600 underline underline-offset-4'
                : 'text-amber-600 hover:text-amber-700'
            }`}
          >
            🔥 FireLens Science
          </a>
          <a
            href="#evidence"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('evidence');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'evidence'
                ? 'text-slate-900 underline underline-offset-4'
                : ''
            }`}
          >
            Evidence Graph
          </a>
          <a
            href="#routing"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('routing');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'routing'
                ? 'text-slate-900 underline underline-offset-4'
                : ''
            }`}
          >
            Emergency Routing
          </a>
          <a
            href="#simulation"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('simulation');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'simulation'
                ? 'text-slate-900 underline underline-offset-4'
                : ''
            }`}
          >
            Simulation
          </a>
        </nav>

        {/* Zone 3: Role clearance badge + Command Search */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-mono text-slate-700 transition-colors"
            title="Active Security Clearance & RBAC Role"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold uppercase">{currentRole}</span>
            <span className="text-slate-400">L{getRoleProfileData(currentRole).clearanceLevel}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPaletteOpen(true)}
            className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            Search (⌘K)
          </button>
        </div>
      </header>

      {/* Main Workspace Body: Collapsible Left Sidebar + Fluid Content Stage */}
      <div className="flex-1 flex min-w-0">
        <aside
          aria-label="Operational Modules Sidebar"
          className={`hidden lg:flex flex-col justify-between bg-white border-r border-slate-200/90 shrink-0 transition-all ${
            sidebarCollapsed ? 'w-16' : 'w-60'
          }`}
        >
          <div className={`flex-1 overflow-y-auto p-3 ${sidebarCollapsed ? 'space-y-4' : 'space-y-5'}`}>
            {!sidebarCollapsed && (
              <div className="px-2 pt-1">
                <label
                  htmlFor="region-selector"
                  className="block text-[11px] font-mono text-slate-500 mb-1"
                >
                  Monitored Sector
                </label>
                <select
                  id="region-selector"
                  value={selectedRegion.id}
                  onChange={(e) => {
                    const found = MONITORED_REGIONS.find(
                      (r) => r.id === e.target.value
                    );
                    if (found) setSelectedRegion(found);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                >
                  {MONITORED_REGIONS.map((reg) => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {SIDEBAR_GROUPS.map((group) => (
              <div key={group.groupTitle}>
                {!sidebarCollapsed && (
                  <div className="px-2.5 text-[11px] font-semibold text-slate-400 mb-1.5">
                    {group.groupTitle}
                  </div>
                )}
                <div className="space-y-1">
                  {group.items.map((item, index) => {
                    const active = activeTab === item.id;
                    const compactLabel = item.label.replace(/^\d+\.\s*/, '').split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        title={item.label}
                        aria-current={active ? 'page' : undefined}
                        className={`w-full ${sidebarCollapsed ? 'h-10 flex items-center justify-center px-1' : 'min-h-9 px-2.5 py-2'} text-left rounded-lg text-xs font-medium transition-colors whitespace-nowrap truncate ${
                          active
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {sidebarCollapsed ? <span aria-hidden="true" className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>{compactLabel || String(index + 1)}</span> : item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-slate-200/80 bg-white">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-label={sidebarCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
              className="w-full min-h-9 px-2.5 py-1.5 text-xs font-mono text-slate-600 hover:text-slate-900 bg-slate-50 rounded-lg border border-slate-200/80"
            >
              {sidebarCollapsed ? '»' : '« Collapse Sidebar'}
            </button>
          </div>
        </aside>

        {/* Primary Viewport Stage */}
        <main className="flex-1 min-w-0 p-3.5 sm:p-6 lg:p-8 pb-20 lg:pb-12 max-w-[1440px] mx-auto w-full">
          {activeTab === 'dashboard' && (
            <CommandDashboardView
              incidents={incidents}
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={setSelectedIncidentId}
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
              weather={weatherSnapshots}
              news={NEWS_FEED_ITEMS}
              routes={routes}
              resources={resources}
              agencyTasks={agencyTasks}
              onNavigateTab={(t) => setActiveTab(t as WorkspaceTab)}
              onAcknowledgeAuthorityTask={handleAcknowledgeAuthorityTask}
              onCreatePinnedIncident={handleCreatePinnedIncident}
            />
          )}

          {activeTab === 'incidents' && (
            <IncidentIntelligenceView
              incidents={incidents}
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={setSelectedIncidentId}
              onUpdateIncidentStatus={handleUpdateIncidentStatus}
              onNavigateTab={(t) => setActiveTab(t as WorkspaceTab)}
            />
          )}

          {(activeTab === 'environment' || activeTab === 'news') && (
            <EnvironmentalNewsView
              mode={activeTab}
              weatherSnapshots={weatherSnapshots}
              newsItems={NEWS_FEED_ITEMS}
              onInspectIncident={(id) => {
                setSelectedIncidentId(id);
                setActiveTab('incidents');
              }}
            />
          )}

          {activeTab === 'evidence' && (
            <EvidenceAndAgentsView
              agents={agents}
              onTriggerAgentReevaluation={handleTriggerAgentReevaluation}
            />
          )}

          {activeTab === 'routing' && (
            <RoutingAndCasualtyView
              routes={routes}
              casualtyReports={casualtyReports}
              agencyTasks={agencyTasks}
              onUpdateCasualtyDispatch={handleUpdateCasualtyDispatch}
              onToggleAgencyTask={handleAcknowledgeAuthorityTask}
              onAddAgencyTask={handleAddAgencyTask}
              onCalculateRoute={handleCalculateRoute}
            />
          )}

          {activeTab === 'voice' && (
            <VoiceOperationsView
              incidents={incidents}
              selectedIncidentId={selectedIncidentId}
              calls={calls}
              onRefreshCalls={fetchBackendState}
            />
          )}

          {activeTab === 'fire' && (
            <FireLensResearchView />
          )}

          {activeTab === 'orbital' && (
            <OrbitalIntelligenceView selectedRegionId={selectedRegion.id} />
          )}

          {activeTab === 'community' && (
            <CommunityOperationsView
              userClearance={getRoleProfileData(currentRole).clearanceLevel}
            />
          )}

          {activeTab === 'catalogue' && <DataCatalogueView />}

          {activeTab === 'settings' && (
            <SettingsAndAccessView
              currentRole={currentRole}
              onChangeRole={setCurrentRole}
            />
          )}

          {activeTab === 'backtracking' && <BacktrackingView />}

          {activeTab === 'learning' && <SelfLearningView />}

          {activeTab === 'diagnostics' && <DiagnosticsView />}

          {(activeTab === 'resources' ||
            activeTab === 'simulation' ||
            activeTab === 'reports') && (
            <OperationsAndSimulationView
              activeSection={activeTab}
              resources={resources}
              advisories={advisories}
              incidents={incidents}
              onAssignResource={handleAssignResource}
              onBroadcastAdvisory={handleBroadcastAdvisory}
            />
          )}
        </main>
      </div>

      {/* First-Class Mobile Bottom Tab Bar (5 Thumb-Zone Slots + Slide-Up Modules Sheet) */}
      <nav
        aria-label="Mobile Workspace Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-white/95 border-t border-slate-200/90 px-2 grid grid-cols-5 items-center gap-1"
      >
        {(
          [
            ['dashboard', 'Command'],
            ['incidents', 'Incidents'],
            ['environment', 'Weather'],
            ['routing', 'Response'],
          ] as [WorkspaceTab, string][]
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveTab(tab);
              setMobileModulesOpen(false);
            }}
            className={`min-h-[42px] rounded-xl text-[11px] font-medium flex items-center justify-center transition-colors ${
              activeTab === tab && !mobileModulesOpen
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setMobileModulesOpen((v) => !v)}
          className={`min-h-[42px] rounded-xl text-[11px] font-medium flex items-center justify-center transition-colors ${
            mobileModulesOpen
              ? 'bg-sky-600 text-white font-semibold'
              : 'bg-slate-100 text-slate-800'
          }`}
        >
          Modules
        </button>
      </nav>

      {/* Mobile Slide-Up Bottom Sheet Drawer (All 12 Workspaces, Region Selector & Voice Assistant) */}
      {mobileModulesOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 flex items-end"
          onClick={() => setMobileModulesOpen(false)}
        >
          <div
            className="w-full bg-white rounded-t-3xl border-t border-slate-200 p-4 pb-20 max-h-[82vh] overflow-y-auto space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Mobile Modules and Sector Drawer"
          >
            {/* Drag Handle Affordance */}
            <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto" />

            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  ALEX Operational Workspaces & Sector Control
                </div>
                <div className="text-xs text-slate-500">
                  Switch monitored region, open any module, or launch voice briefing
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileModulesOpen(false)}
                className="px-3 py-1.5 text-xs font-mono bg-slate-100 rounded-lg text-slate-700"
              >
                Close
              </button>
            </div>

            {/* Mobile Region Selector */}
            <div>
              <label
                htmlFor="mobile-region-select"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Active Monitored Region
              </label>
              <select
                id="mobile-region-select"
                value={selectedRegion.id}
                onChange={(e) => {
                  const found = MONITORED_REGIONS.find(
                    (r) => r.id === e.target.value
                  );
                  if (found) setSelectedRegion(found);
                }}
                className="w-full min-h-[42px] px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
              >
                {MONITORED_REGIONS.map((reg) => (
                  <option key={reg.id} value={reg.id}>
                    {reg.name} ({reg.country})
                  </option>
                ))}
              </select>
            </div>

            {/* Voice Briefing Quick Action on Mobile */}
            <button
              type="button"
              onClick={() => {
                setMobileModulesOpen(false);
                setIsVoiceOpen(true);
              }}
              className="w-full min-h-[44px] py-2.5 px-4 bg-slate-900 text-white text-xs font-medium rounded-xl flex items-center justify-between"
            >
              <span>Open ALEX Live Voice Briefing Assistant</span>
              <span className="font-mono text-[11px] text-sky-300">
                16kHz Live →
              </span>
            </button>

            {/* All 12 Workspaces Grid */}
            <div className="space-y-3">
              {SIDEBAR_GROUPS.map((group) => (
                <div key={group.groupTitle}>
                  <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
                    {group.groupTitle}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const active = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileModulesOpen(false);
                          }}
                          className={`min-h-[44px] px-3 py-2 rounded-xl text-left text-xs font-medium border transition-colors ${
                            active
                              ? 'bg-slate-900 border-slate-900 text-white'
                              : 'bg-slate-50 border-slate-200/80 text-slate-800'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Voice Assistant & Command Palette */}
      <VoiceAssistantAndPalette
        incidents={incidents}
        selectedIncidentId={selectedIncidentId}
        selectedRegion={selectedRegion}
        onSelectIncident={setSelectedIncidentId}
        onNavigateTab={(t) => setActiveTab(t as WorkspaceTab)}
        isPaletteOpen={isPaletteOpen}
        onClosePalette={() => setIsPaletteOpen(false)}
        isVoiceOpen={isVoiceOpen}
        onToggleVoiceOpen={setIsVoiceOpen}
      />
    </div>
  );
}
