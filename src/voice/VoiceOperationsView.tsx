import React, { useState } from 'react';
import { IncidentRecord } from '../shared/types';
import { apiClient, TelephonyCallRecord } from '../shared/apiClient';
import { SectionHeader } from '../shared/ui';

interface VoiceOperationsViewProps {
  incidents: IncidentRecord[];
  selectedIncidentId: string;
  calls: TelephonyCallRecord[];
  onRefreshCalls: () => void;
}

export const VoiceOperationsView: React.FC<VoiceOperationsViewProps> = ({
  incidents,
  selectedIncidentId,
  calls,
  onRefreshCalls,
}) => {
  const [activeCallId, setActiveCallId] = useState<string>(calls[0]?.id || '');
  const [recipientName, setRecipientName] = useState('Dr. S. Ramanathan');
  const [recipientAgency, setRecipientAgency] = useState('Nilgiris District Headquarters Hospital');
  const [phoneNumber, setPhoneNumber] = useState('+91-423-2444108');
  const [recipientRole, setRecipientRole] =
    useState<TelephonyCallRecord['role']>('Hospital Chief of Trauma');
  const [initialMessage, setInitialMessage] = useState(
    'Urgent medical briefing regarding 2 verified smoke inhalation casualties in Masinagudi.'
  );
  const [isDialing, setIsDialing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Recipient action form
  const [unitsCommitted, setUnitsCommitted] = useState<number>(1);
  const [etaMinutes, setEtaMinutes] = useState<number>(20);
  const [actionNotes, setActionNotes] = useState('Trauma bay reserved and ready.');
  const [confirmationCode, setConfirmationCode] = useState('AUTH-OOTY-88');

  const activeCall = calls.find((c) => c.id === activeCallId) || calls[0];

  const handleInitiateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDialing(true);
    setFeedbackMsg(null);
    try {
      const call = await apiClient.initiateTelephonyCall({
        recipientName,
        recipientAgency,
        phoneNumber,
        role: recipientRole,
        incidentId: selectedIncidentId,
        initialMessage,
      });
      setActiveCallId(call.id);
      setFeedbackMsg(`Call ${call.id} initiated to ${recipientName}. Connecting via telephony pipeline...`);
      onRefreshCalls();
    } catch (err: any) {
      setFeedbackMsg(`Failed to initiate call: ${err.message}`);
    } finally {
      setIsDialing(false);
    }
  };

  const handleAuthorizeAction = async (accepted: boolean) => {
    if (!activeCall) return;
    try {
      await apiClient.respondToCall(activeCall.id, {
        actionAccepted: accepted,
        unitsCommitted,
        etaMinutes,
        notes: actionNotes,
        confirmationCode,
      });
      setFeedbackMsg(`Call ${activeCall.id} updated: Action ${accepted ? 'ACCEPTED' : 'ACKNOWLEDGED'}.`);
      onRefreshCalls();
    } catch (err: any) {
      setFeedbackMsg(`Update failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="Telephony Service · Online"
        title="Voice Operations & Telephony Engine"
        subtitle="Operational voice communications pipeline with mandatory AI identification, recording consent, and authenticated recipient dispatch workflows."
      />

      {feedbackMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between">
          <span>◆ {feedbackMsg}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="underline font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Compliance & Safeguards Banner */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono tracking-wider uppercase text-emerald-400">
              Telecom Compliance & Legal Safeguards Active
            </span>
          </div>
          <p className="text-xs text-slate-300">
            ALEX strictly identifies itself as an automated system at call outset. Automated public 911/112 dialing is disabled. All casualty dispatch requests require authenticated recipient credentials.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="px-2.5 py-1 text-[11px] font-mono bg-white/10 rounded-lg text-slate-200 border border-white/10">
            PSTN Carrier: Verified SIP
          </span>
          <span className="px-2.5 py-1 text-[11px] font-mono bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30">
            Caller ID: +91-423-EOC-ALEX
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Call Transcript & Audio Stream */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {activeCall ? activeCall.recipientName : 'No Active Call'}
                </h3>
                <p className="text-xs text-slate-500">
                  {activeCall?.recipientAgency} · {activeCall?.role}
                </p>
              </div>
              {activeCall && (
                <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60 uppercase">
                  {activeCall.state.replace(/_/g, ' ')}
                </span>
              )}
            </div>

            {/* Transcript Flow */}
            <div className="space-y-3 min-h-[300px] max-h-[420px] overflow-y-auto p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 text-xs">
              {activeCall?.transcript.map((line, idx) => {
                const isAlex = line.speaker === 'ALEX';
                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isAlex ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-slate-400">
                      <span>{line.speaker}</span>
                      <span>·</span>
                      <span>{line.timestamp.slice(11, 19)} UTC</span>
                    </div>
                    <div
                      className={`max-w-[85%] p-3 rounded-xl leading-relaxed ${
                        isAlex
                          ? 'bg-white text-slate-900 border border-slate-200 shadow-xs'
                          : 'bg-slate-900 text-white'
                      }`}
                    >
                      {line.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Structured Outcome Drawer */}
            {activeCall && (
              <div className="p-3.5 bg-slate-100/70 border border-slate-200 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">
                  Extracted Telephony Outcome
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                    <div className="text-[10px] text-slate-500">Units Committed</div>
                    <div className="font-semibold text-slate-900">
                      {activeCall.extractedOutcome.unitsCommitted || '0'}
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                    <div className="text-[10px] text-slate-500">Reported ETA</div>
                    <div className="font-semibold text-slate-900">
                      {activeCall.extractedOutcome.etaMinutes
                        ? `${activeCall.extractedOutcome.etaMinutes} min`
                        : 'Pending'}
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200/60">
                    <div className="text-[10px] text-slate-500">Auth Code</div>
                    <div className="font-mono text-xs font-semibold text-slate-900 truncate">
                      {activeCall.extractedOutcome.confirmationCode || 'Unassigned'}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-600 italic">
                  Notes: {activeCall.extractedOutcome.operatorNotes || 'None'}
                </div>
              </div>
            )}

            {/* Recipient Response Action Panel */}
            {activeCall && activeCall.state !== 'action_accepted' && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                <div className="text-xs font-semibold text-amber-900">
                  Recipient Authority Response Sign-off
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-slate-600 block">Units</label>
                    <input
                      type="number"
                      value={unitsCommitted}
                      onChange={(e) => setUnitsCommitted(parseInt(e.target.value, 10))}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-600 block">ETA (min)</label>
                    <input
                      type="number"
                      value={etaMinutes}
                      onChange={(e) => setEtaMinutes(parseInt(e.target.value, 10))}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-mono text-slate-600 block">Auth Code</label>
                    <input
                      type="text"
                      value={confirmationCode}
                      onChange={(e) => setConfirmationCode(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAuthorizeAction(true)}
                    className="flex-1 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                  >
                    Accept Action & Commit Units
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAuthorizeAction(false)}
                    className="px-3 py-2 text-xs font-medium bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                  >
                    Acknowledge Only
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Initiate Outbound Call & Directory */}
        <div className="lg:col-span-5 space-y-4">
          <form
            onSubmit={handleInitiateCall}
            className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-4"
          >
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
              Initiate Operational Call
            </h3>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Recipient Contact & Role
              </label>
              <select
                value={recipientRole}
                onChange={(e) => {
                  const role = e.target.value as TelephonyCallRecord['role'];
                  setRecipientRole(role);
                  if (role === 'Hospital Chief of Trauma') {
                    setRecipientName('Dr. S. Ramanathan');
                    setRecipientAgency('Nilgiris District Headquarters Hospital');
                    setPhoneNumber('+91-423-2444108');
                  } else if (role === '108 EMS Dispatcher') {
                    setRecipientName('Officer K. Murugan');
                    setRecipientAgency('GVK EMRI 108 Emergency Centre');
                    setPhoneNumber('+91-423-2440108');
                  } else if (role === 'District Incident Commander') {
                    setRecipientName('P. Soundararajan, IAS');
                    setRecipientAgency('Nilgiris District Collectorate & EOC');
                    setPhoneNumber('+91-423-2442344');
                  } else {
                    setRecipientName('V. Chandrasekaran');
                    setRecipientAgency('Tamil Nadu Forest Department (Nilgiris)');
                    setPhoneNumber('+91-423-2443968');
                  }
                }}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900"
              >
                <option value="Hospital Chief of Trauma">Hospital Chief of Trauma</option>
                <option value="108 EMS Dispatcher">108 EMS Dispatcher</option>
                <option value="District Incident Commander">District Incident Commander</option>
                <option value="Range Forest Officer">Range Forest Officer</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-500 block mb-0.5">Name</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-0.5">Phone</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Briefing Message / Tactical Dispatch Objective
              </label>
              <textarea
                rows={3}
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={isDialing}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isDialing ? (
                <span>Dialing Telephony Carrier...</span>
              ) : (
                <span>Initiate Outbound Call & Announce AI Identity</span>
              )}
            </button>
          </form>

          {/* Call History */}
          <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider font-mono">
                Call Log Archive ({calls.length})
              </h4>
              <button
                type="button"
                onClick={onRefreshCalls}
                className="text-[11px] font-mono text-indigo-600 hover:underline"
              >
                Refresh
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {calls.map((c) => {
                const active = c.id === activeCall?.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCallId(c.id)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition-colors flex items-center justify-between ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200/70'
                    }`}
                  >
                    <div>
                      <div className="font-medium truncate">{c.recipientName}</div>
                      <div
                        className={`text-[10px] ${active ? 'text-slate-300' : 'text-slate-500'}`}
                      >
                        {c.role} · {c.initiatedAt.slice(11, 16)} UTC
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {c.state.replace(/_/g, ' ')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
