import React, { useEffect, useMemo, useState } from 'react';
import {
  AgencyTask,
  CasualtyReportRecord,
  DispatchWorkflowState,
  RouteOption,
  VehicleCategory,
} from '../shared/types';
import {
  canTransitionDispatchStatus,
  rankEmergencyRoutes,
} from '../shared/intelligenceEngine';
import { ProvenanceNoticeBanner, SectionHeader } from '../shared/ui';
import { apiClient } from '../shared/apiClient';
import {
  ROAD_HAZARD_SEGMENTS,
  RESPONDER_APPARATUS_FLEET,
  CONFIRMED_STAGING_YARDS,
  evaluateRouteClearance,
  ResponderVehicleClass,
} from '../shared/roadHazardsAndResourcesData';

interface RoutingAndCasualtyViewProps {
  routes: RouteOption[];
  casualtyReports: CasualtyReportRecord[];
  agencyTasks: AgencyTask[];
  onUpdateCasualtyDispatch: (
    reportId: string,
    nextState: DispatchWorkflowState,
    authorizedConfirmed: boolean
  ) => void;
  onToggleAgencyTask: (taskId: string) => void;
  onAddAgencyTask: (
    agency: AgencyTask['agency'],
    title: string,
    owner: string
  ) => void;
  onCalculateRoute: (params: Parameters<typeof apiClient.calculateEmergencyRoute>[0]) => Promise<void>;
}

const DISPATCH_STEPS: { state: DispatchWorkflowState; label: string }[] = [
  { state: 'draft', label: '1. Draft Request' },
  { state: 'awaiting_dispatcher_approval', label: '2. Awaiting Approval' },
  { state: 'submitted', label: '3. Submitted to 108' },
  { state: 'acknowledged', label: '4. Acknowledged' },
  { state: 'assigned', label: '5. Unit Assigned' },
  { state: 'en_route', label: '6. En Route (CAD)' },
  { state: 'on_scene', label: '7. On Scene' },
  { state: 'completed', label: '8. Completed' },
];

export const RoutingAndCasualtyView: React.FC<RoutingAndCasualtyViewProps> = ({
  routes,
  casualtyReports,
  agencyTasks,
  onUpdateCasualtyDispatch,
  onToggleAgencyTask,
  onAddAgencyTask,
  onCalculateRoute,
}) => {
  const [subTab, setSubTab] = useState<'routing' | 'casualty' | 'agencies' | 'hazards_fleet'>('routing');
  const [vehicleProfile, setVehicleProfile] = useState<VehicleCategory>('fire_engine');
  const [simulatePrimaryClosed, setSimulatePrimaryClosed] = useState(false);
  const [selectedCasualtyId, setSelectedCasualtyId] = useState<string>(
    casualtyReports[0]?.id || 'CAS-2026-01'
  );
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [selectedClearanceVehicle, setSelectedClearanceVehicle] = useState<ResponderVehicleClass>('TACTICAL_WATER_TENDER_HEAVY');
  const [vehicleWeightInput, setVehicleWeightInput] = useState<number>(18);
  const [vehicleHeightInput, setVehicleHeightInput] = useState<number>(3.6);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAgency, setNewTaskAgency] =
    useState<AgencyTask['agency']>('Fire & Rescue');
  const [newTaskOwner, setNewTaskOwner] = useState('');
  const [taskFormError, setTaskFormError] = useState<string | null>(null);
  const [routeOrigin, setRouteOrigin] = useState('11.4064,76.6932');
  const [routeDestination, setRouteDestination] = useState('11.4100,76.7000');
  const [routeStatus, setRouteStatus] = useState<{ provider: string; configured: boolean; message: string } | null>(null);
  const [routeRequestError, setRouteRequestError] = useState<string | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  useEffect(() => { apiClient.getRouteProviderStatus().then(setRouteStatus).catch(() => setRouteStatus(null)); }, []);

  const requestRoute = async () => {
    const parse = (value: string) => value.split(',').map(Number);
    const origin = parse(routeOrigin), destination = parse(routeDestination);
    if (origin.length !== 2 || destination.length !== 2 || [...origin, ...destination].some((value) => !Number.isFinite(value))) {
      setRouteRequestError('Enter coordinates as latitude,longitude for both locations.');
      return;
    }
    setIsCalculatingRoute(true); setRouteRequestError(null);
    try {
      await onCalculateRoute({ origin: [origin[0], origin[1]], destination: [destination[0], destination[1]], originName: 'Response origin', destinationName: 'Incident destination', vehicleCategory: vehicleProfile });
    } catch (error: any) { setRouteRequestError(error.message || 'Route calculation failed.'); }
    finally { setIsCalculatingRoute(false); }
  };

  const rankedRoutes = useMemo(
    () => rankEmergencyRoutes(routes, vehicleProfile, simulatePrimaryClosed),
    [routes, vehicleProfile, simulatePrimaryClosed]
  );

  const activeCasualty =
    casualtyReports.find((c) => c.id === selectedCasualtyId) ||
    casualtyReports[0];

  const handleDispatchTransition = (
    report: CasualtyReportRecord,
    nextState: DispatchWorkflowState
  ) => {
    const check = canTransitionDispatchStatus(
      report.dispatchState,
      nextState,
      report.authorizedIntegrationConfirmed
    );
    if (!check.allowed) {
      setDispatchError(check.reason || 'Transition not permitted.');
      return;
    }
    setDispatchError(null);
    onUpdateCasualtyDispatch(
      report.id,
      nextState,
      report.authorizedIntegrationConfirmed
    );
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskOwner.trim()) {
      setTaskFormError(
        'Both task directive and assigned agency officer are required.'
      );
      return;
    }
    setTaskFormError(null);
    onAddAgencyTask(newTaskAgency, newTaskTitle.trim(), newTaskOwner.trim());
    setNewTaskTitle('');
    setNewTaskOwner('');
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <ProvenanceNoticeBanner
        modeLabel="Advisory Routing & Emergency Medical Preparation"
        detail="Ordinary map routing does not independently verify physical emergency-vehicle access, bridge load integrity, or live fire-line road safety. All dispatches require authorised service confirmation."
      />

      <SectionHeader
        kicker="Apparatus Access, Triage Preparation & Multi-Agency Command"
        title="Smart Emergency Routing, Casualty Triage & Inter-Agency Coordination"
        subtitle="Compare vehicle-specific corridors, prepare structured ambulance requests with explicit dispatcher gates, and coordinate multi-agency tasks."
        rightSlot={
          <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSubTab('routing')}
              className={`flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                subTab === 'routing'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Smart Routing
            </button>
            <button
              type="button"
              onClick={() => setSubTab('casualty')}
              className={`flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                subTab === 'casualty'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Casualty & EMS ({casualtyReports.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('agencies')}
              className={`flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                subTab === 'agencies'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Agency Matrix ({agencyTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('hazards_fleet')}
              className={`flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                subTab === 'hazards_fleet'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⛔ Road Hazards & Fleet Logistics ({ROAD_HAZARD_SEGMENTS.length})
            </button>
          </div>
        }
      />

      {subTab === 'routing' && (
        <div className="space-y-5 sm:space-y-6">
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <div className="lg:col-span-3 flex items-center justify-between gap-3">
              <div><h3 className="text-sm font-semibold">Live route request</h3><p className="text-xs text-slate-300">{routeStatus?.message || 'Checking route provider…'}</p></div>
              <span className={`text-[11px] font-mono px-2 py-1 rounded ${routeStatus?.configured ? 'bg-emerald-400/20 text-emerald-200' : 'bg-amber-400/20 text-amber-100'}`}>{routeStatus?.provider || 'Unavailable'}</span>
            </div>
            <label className="text-xs text-slate-200">Origin (lat,lng)<input value={routeOrigin} onChange={(event) => setRouteOrigin(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white" /></label>
            <label className="text-xs text-slate-200">Destination (lat,lng)<input value={routeDestination} onChange={(event) => setRouteDestination(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white" /></label>
            <button type="button" onClick={() => void requestRoute()} disabled={isCalculatingRoute} className="min-h-[38px] rounded-lg bg-sky-400 px-4 text-xs font-semibold text-slate-950 disabled:opacity-60">{isCalculatingRoute ? 'Calculating…' : 'Prepare route'}</button>
            {routeRequestError && <p className="lg:col-span-3 text-xs text-rose-200">{routeRequestError}</p>}
          </div>
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
              <span className="text-xs font-semibold text-slate-800 shrink-0">
                Apparatus:
              </span>
              {(
                [
                  ['fire_engine', 'Heavy Fire Engine (18T)'],
                  ['ambulance', 'ALS / BLS Ambulance'],
                  ['rescue_vehicle', '4x4 Mountain Rescue'],
                  ['logistics_vehicle', 'Bulk Water Tanker'],
                ] as [VehicleCategory, string][]
              ).map(([cat, label]) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setVehicleProfile(cat)}
                  className={`min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-xl border whitespace-nowrap shrink-0 transition-colors ${
                    vehicleProfile === cat
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSimulatePrimaryClosed((v) => !v)}
              className={`min-h-[38px] px-3.5 py-1.5 text-xs font-medium rounded-xl border whitespace-nowrap shrink-0 transition-colors ${
                simulatePrimaryClosed
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {simulatePrimaryClosed
                ? '▲ Simulating NH-181 Closure (Rerouted)'
                : 'Test NH-181 Corridor Closure'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {rankedRoutes.map((rt) => (
              <div
                key={rt.id}
                className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
                  rt.isRecommended
                    ? 'border-slate-900 ring-1 ring-slate-900'
                    : 'border-slate-200/90'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-slate-800">
                      {rt.id}
                    </span>
                    <span
                      className={`font-semibold ${
                        rt.isRecommended
                          ? 'text-emerald-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {rt.isRecommended
                        ? '◆ Recommended Corridor'
                        : 'Alternative Route'}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-slate-900 mt-1.5">
                    {rt.name}
                  </h3>
                  <div className="text-xs text-slate-500 mt-1">
                    {rt.originName} → {rt.destinationName}
                  </div>

                  <div className="grid grid-cols-3 gap-2 my-4 pt-3 border-t border-slate-200/80 font-mono">
                    <div>
                      <div className="text-[11px] text-slate-500">Est. Time</div>
                      <div className="text-lg font-bold text-slate-900">
                        {rt.effectiveDurationMin} min
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Distance</div>
                      <div className="text-lg font-bold text-slate-900">
                        {rt.distanceKm} km
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Confidence</div>
                      <div className="text-lg font-bold text-sky-700">
                        {rt.confidencePct}%
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    {rt.recommendationReason}
                  </p>

                  {rt.roadRestrictions.length > 0 && (
                    <div className="mt-3 p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-950">
                      <span className="font-semibold">Restriction: </span>
                      {rt.roadRestrictions.join(' · ')}
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-4 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span className="truncate">{rt.statusNote}</span>
                  <span className="shrink-0 ml-2">
                    Plume: {rt.hazardProximityKm} km
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'casualty' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          <div className="lg:col-span-5 space-y-3">
            {casualtyReports.map((rep) => {
              const active = rep.id === activeCasualty.id;
              return (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => {
                    setSelectedCasualtyId(rep.id);
                    setDispatchError(null);
                  }}
                  className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
                    active
                      ? 'bg-white border-slate-900 ring-1 ring-slate-900'
                      : 'bg-white border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-slate-900">
                      {rep.id} · {rep.urgency}
                    </span>
                    <span className="font-mono text-sky-700">
                      {rep.dispatchState.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">
                    {rep.locationName}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Injured:{' '}
                    <span className="font-mono font-semibold">
                      {rep.injuredCount}
                    </span>{' '}
                    · Missing:{' '}
                    <span className="font-mono font-semibold">
                      {rep.missingCount}
                    </span>{' '}
                    · Uncertainty:{' '}
                    <span className="font-mono">
                      ±{rep.uncertaintyRadiusMeters}m
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1.5">
                    Verification: {rep.verificationStatus}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 space-y-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3.5 pb-4 border-b border-slate-200/80">
              <div>
                <div className="text-xs font-mono text-slate-500">
                  Ambulance & SAR Preparation Panel · {activeCasualty.id}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mt-0.5">
                  {activeCasualty.locationName}
                </h3>
                <div className="text-xs text-slate-600 mt-0.5">
                  Source: {activeCasualty.source} (
                  {activeCasualty.verificationStatus})
                </div>
              </div>

              <label className="min-h-[38px] flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeCasualty.authorizedIntegrationConfirmed}
                  onChange={(e) =>
                    onUpdateCasualtyDispatch(
                      activeCasualty.id,
                      activeCasualty.dispatchState,
                      e.target.checked
                    )
                  }
                  className="rounded border-slate-300"
                />
                <span>108 CAD Integration Confirmed</span>
              </label>
            </div>

            {dispatchError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                <span className="font-semibold">
                  ✖ Verification Gate Blocked:{' '}
                </span>
                {dispatchError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="font-semibold text-slate-800 mb-1">
                  Clinical Presentation & Triage Notes
                </div>
                <p className="text-slate-700 leading-relaxed">
                  {activeCasualty.medicalNotes}
                </p>
                <div className="mt-2 font-mono text-slate-600">
                  Required: {activeCasualty.requiredResources.join(' + ')}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                <div className="font-semibold text-slate-800 mb-1">
                  Receiving Trauma / Burn Destination
                </div>
                <div className="text-slate-900 font-medium">
                  {activeCasualty.suggestedHospital}
                </div>
                <div className="font-mono text-slate-600 mt-1">
                  Corridor Distance: {activeCasualty.hospitalDistanceKm} km via
                  NH-181
                </div>
                <div className="text-slate-500 mt-1">
                  {activeCasualty.dispatcherNotes}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/80">
              <div className="text-xs font-semibold text-slate-800 mb-2.5">
                Dispatch State Progression (Sequential Verification Enforced)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DISPATCH_STEPS.map((step) => {
                  const isCurrent = activeCasualty.dispatchState === step.state;
                  return (
                    <button
                      key={step.state}
                      type="button"
                      onClick={() =>
                        handleDispatchTransition(activeCasualty, step.state)
                      }
                      className={`min-h-[42px] p-2.5 rounded-xl border text-left text-xs font-medium transition-colors ${
                        isCurrent
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {step.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'agencies' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h3 className="text-base font-semibold text-slate-900 pb-3 border-b border-slate-200/80">
              Multi-Agency Role Ownership & Incident Command Matrix
            </h3>
            <div className="divide-y divide-slate-200/70">
              {agencyTasks.map((t) => (
                <div
                  key={t.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="max-w-xl">
                    <div className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">
                        {t.agency}
                      </span>{' '}
                      · Owner: {t.owner} ·{' '}
                      <span className="font-mono">{t.timestamp}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 mt-1">
                      {t.title}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {t.notes}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                    <span className="text-xs font-mono text-slate-700">
                      {t.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleAgencyTask(t.id)}
                      className="min-h-[36px] px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl"
                    >
                      Advance Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h3 className="text-base font-semibold text-slate-900 pb-3 border-b border-slate-200/80">
              Assign Inter-Agency Task
            </h3>
            <form onSubmit={handleCreateTask} className="space-y-3 mt-3">
              {taskFormError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                  {taskFormError}
                </div>
              )}
              <div>
                <label
                  htmlFor="agency-select"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Target Agency
                </label>
                <select
                  id="agency-select"
                  value={newTaskAgency}
                  onChange={(e) =>
                    setNewTaskAgency(e.target.value as AgencyTask['agency'])
                  }
                  className="w-full min-h-[40px] px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="Fire & Rescue">Fire & Rescue</option>
                  <option value="Emergency Medical Services">
                    Emergency Medical Services
                  </option>
                  <option value="Forest Department">Forest Department</option>
                  <option value="District Police">District Police</option>
                  <option value="District EOC">District EOC</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="task-directive-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Operational Task Directive
                </label>
                <input
                  id="task-directive-input"
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g., Deploy mobile water bowser to Hairpin 12"
                  className="w-full min-h-[40px] px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label
                  htmlFor="task-owner-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Assigned Command Officer
                </label>
                <input
                  id="task-owner-input"
                  type="text"
                  value={newTaskOwner}
                  onChange={(e) => setNewTaskOwner(e.target.value)}
                  placeholder="e.g., Divisional Fire Officer Coonoor"
                  className="w-full min-h-[40px] px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[42px] py-2 px-4 text-xs font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800"
              >
                Log Inter-Agency Task
              </button>
            </form>
          </div>
        </div>
      )}

      {subTab === 'hazards_fleet' && (
        <div className="space-y-6">
          {/* Top: Road Hazards & Interactive Bridge Clearance Evaluation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Road Closures & Bridge Restrictions */}
            <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Verified Highway Closures & Structural Bridge Limits
                  </h3>
                  <p className="text-xs text-slate-500">
                    State DOT 511 & Highway Patrol field-verified hazards restricting emergency access.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                  {ROAD_HAZARD_SEGMENTS.length} Hazards Active
                </span>
              </div>

              <div className="space-y-3">
                {ROAD_HAZARD_SEGMENTS.map((haz) => (
                  <div
                    key={haz.hazardId}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-red-700">{haz.hazardId}</span>
                          <span className="text-xs font-bold text-slate-900">{haz.roadName} ({haz.highwayCode})</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Verified by {haz.verifiedBy} at {haz.verifiedAtUtc.slice(11, 16)} UTC
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        haz.severity === 'CRITICAL_IMPASSABLE'
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        {haz.severity.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-slate-700">
                        <span>Hazard Type: <strong>{haz.hazardType.replace(/_/g, ' ')}</strong></span>
                        {haz.maxVehicleWeightTons && (
                          <span className="font-mono text-amber-800 font-bold">
                            Max {haz.maxVehicleWeightTons} Metric Tons
                          </span>
                        )}
                      </div>
                      {haz.disqualifiedVehicleTypes.length > 0 && (
                        <div className="text-[11px] text-red-700">
                          Disqualified: {haz.disqualifiedVehicleTypes.join(', ')}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-600 italic pt-1 border-t border-slate-100">
                        Detour: {haz.tacticalDetourRecommendation}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 5 cols: Interactive Route Clearance Tool */}
            <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
              <div className="border-b border-slate-200/80 pb-3">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Corridor Clearance & Bridge Capacity Test
                </h3>
                <p className="text-xs text-slate-500">
                  Evaluate whether a heavy apparatus profile can clear physical pinch-points.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Apparatus Profile Class
                  </label>
                  <select
                    value={selectedClearanceVehicle}
                    onChange={(e) => setSelectedClearanceVehicle(e.target.value as ResponderVehicleClass)}
                    className="w-full min-h-[38px] px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="TYPE_1_STRUCTURAL_ENGINE">Type-1 Structural Engine (16t, 3.4m)</option>
                    <option value="TYPE_3_WILDLAND_ENGINE">Type-3 Wildland Engine (12t, 3.0m)</option>
                    <option value="TACTICAL_WATER_TENDER_HEAVY">Tactical Heavy Water Tender (18t, 3.8m)</option>
                    <option value="ALS_PARAMEDIC_AMBULANCE">ALS Paramedic Ambulance (4.5t, 2.7m)</option>
                    <option value="BULLDOZER_TRANSPORT_DOZER">Bulldozer Transport Rig (28t, 4.2m)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">
                      Gross Weight (Tons)
                    </label>
                    <input
                      type="number"
                      value={vehicleWeightInput}
                      onChange={(e) => setVehicleWeightInput(Number(e.target.value))}
                      className="w-full min-h-[38px] px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">
                      Clearance Height (m)
                    </label>
                    <input
                      type="number"
                      step={0.1}
                      value={vehicleHeightInput}
                      onChange={(e) => setVehicleHeightInput(Number(e.target.value))}
                      className="w-full min-h-[38px] px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>

                {/* Clearance Evaluation Output */}
                {(() => {
                  const check = evaluateRouteClearance(
                    selectedClearanceVehicle,
                    vehicleWeightInput,
                    vehicleHeightInput,
                    ['HAZ-NIL-001', 'HAZ-NIL-002', 'HAZ-NIL-003']
                  );

                  return (
                    <div className={`p-4 rounded-xl border mt-4 space-y-2 ${
                      check.isTraversable
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-red-50 border-red-200 text-red-950'
                    }`}>
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <span>{check.isTraversable ? '✓ Route Cleared' : '⛔ Route Impassable'}</span>
                      </div>
                      <p className="text-xs leading-relaxed">{check.clearanceReason}</p>
                      {check.blockingHazards.map((b) => (
                        <div key={b.hazardId} className="text-[11px] font-mono bg-white/80 p-2 rounded border border-red-100">
                          {b.roadName}: {b.hazardType} (Max: {b.maxVehicleWeightTons ?? 'N/A'}t, {b.maxVehicleHeightMeters ?? 'N/A'}m)
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Bottom: Live Responder Fleet Telemetry & Confirmed Staging Yards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Live Responder Fleet Telemetry */}
            <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Live Responder Apparatus Fleet (AVL Telemetry)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Automated Vehicle Location (AVL) GPS telemetry, water tank gauges & CAD deployment status.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  {RESPONDER_APPARATUS_FLEET.length} Units Online
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {RESPONDER_APPARATUS_FLEET.map((unit) => (
                  <div
                    key={unit.apparatusId}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-mono text-xs font-bold text-amber-800">{unit.apparatusId}</div>
                        <h5 className="font-bold text-slate-900 text-sm mt-0.5">{unit.callsign}</h5>
                        <p className="text-[11px] text-slate-500">{unit.agencyAffiliation}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-800 border border-slate-200">
                        {unit.cadStatus.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Water</span>
                        <span className="font-bold text-sky-700">{unit.waterRemainingPct}%</span>
                        <span className="text-[9px] text-slate-400 block">{unit.waterTankCapacityLiters}L</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Fuel</span>
                        <span className="font-bold text-slate-900">{unit.fuelRemainingPct}%</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Crew</span>
                        <span className="font-bold text-slate-900">{unit.crewOnBoard} Px</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-slate-200">
                      <span>Coords: {unit.telemetry.lat.toFixed(4)}, {unit.telemetry.lng.toFixed(4)}</span>
                      <span>Speed: {unit.telemetry.speedKmh} km/h</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 5 cols: Confirmed Staging Yards */}
            <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
              <div className="border-b border-slate-200/80 pb-3">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Confirmed Incident Staging Yards & Resource Bases
                </h3>
                <p className="text-xs text-slate-500">
                  Verified forward logistical staging areas with water, fuel & medical assets.
                </p>
              </div>

              <div className="space-y-3">
                {CONFIRMED_STAGING_YARDS.map((yard) => (
                  <div
                    key={yard.stagingId}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-purple-900">{yard.stagingId}</span>
                        <h5 className="font-bold text-slate-900">{yard.name}</h5>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {yard.currentStationedCount} / {yard.yardCapacityApparatus} App.
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                      <div>Hydrant Refill: <strong>{yard.hasWaterRefillHydrant ? 'Available' : 'None'}</strong></div>
                      <div>Fuel Depot: <strong>{yard.hasFuelDepot ? 'Active' : 'No'}</strong></div>
                      <div>Helitack Dip Tank: <strong>{yard.hasHelitackRetardantDipTank ? 'Ready' : 'No'}</strong></div>
                      <div>Medical Triage: <strong>{yard.medicalTriageCapability ? 'Equipped' : 'No'}</strong></div>
                    </div>

                    <div className="text-[11px] text-slate-500 italic">
                      Liaison: {yard.commandLiaisonOfficer} · Road: {yard.accessRoadCondition.replace(/_/g, ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
