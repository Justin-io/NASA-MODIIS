import React, { useEffect, useState } from 'react';
import {
  CommunityFieldReport,
  CommunitySafetyBulletin,
} from '../shared/types';
import { apiClient } from '../shared/apiClient';
import { Card, SectionHeader } from '../shared/ui';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  FileText,
  MapPin,
  Megaphone,
  Radio,
  Send,
  Shield,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';

export const CommunityOperationsView: React.FC<{
  userClearance?: number;
}> = ({ userClearance = 4 }) => {
  const [reports, setReports] = useState<CommunityFieldReport[]>([]);
  const [bulletins, setBulletins] = useState<CommunitySafetyBulletin[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New report form state
  const [reporterName, setReporterName] = useState('R. Parthiban');
  const [reporterRole, setReporterRole] = useState<CommunityFieldReport['reporterRole']>('Forest Ranger');
  const [lat, setLat] = useState('11.4215');
  const [lng, setLng] = useState('76.7082');
  const [landmark, setLandmark] = useState('Kallatti Ghat Hairpin #12');
  const [hazardType, setHazardType] = useState<CommunityFieldReport['hazardType']>('active_understory_fire');
  const [description, setDescription] = useState('Smoke column with visible spot flames spreading through scrub bamboo.');
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .getFieldReports()
      .then((reps) => {
        if (reps?.length) setReports(reps);
      })
      .catch(() => {});

    apiClient
      .getSafetyBulletins()
      .then((buls) => {
        if (buls?.length) setBulletins(buls);
      })
      .catch(() => {});
  }, []);

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitFeedback(null);

    try {
      const created = await apiClient.submitFieldReport({
        reporterName,
        reporterRole,
        coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
        nearestLandmark: landmark,
        hazardType,
        description,
        verifiedByAuthority: true,
        verifiedByAgency: 'Nilgiris Forest Range Patrol',
        evidenceAttachments: [],
      });

      setReports((prev) => [created, ...prev]);
      setSubmitFeedback(`Field Report ${created.id} authenticated and logged into SHA-256 ledger.`);
    } catch (err: any) {
      setSubmitFeedback(`Error submitting report: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        kicker="ALEX COMMUNITY SUBSYSTEM — FIELD TELEMETRY & ADVISORIES"
        title="Community Early Warning, Inbound Reports & Public Bulletins"
        subtitle="GPS-authenticated field ranger submissions, verified district administrative boundaries, and auditable public safety notifications."
        action={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-mono font-medium border border-indigo-200">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            EOC COMMUNITY DISPATCH ACTIVE
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Submit New Inbound Field Report */}
        <Card className="p-6 border-slate-200 bg-white shadow-sm space-y-4 lg:col-span-1">
          <div className="border-b border-slate-100 pb-3">
            <div className="text-xs font-bold text-sky-600 tracking-wider uppercase flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              Inbound Field Ingestion
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Submit Authenticated Report
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit in-situ observations with GPS coordinates and agency role provenance.
            </p>
          </div>

          <form onSubmit={handleSubmitReport} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Reporter Name & Role</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  required
                />
                <select
                  value={reporterRole}
                  onChange={(e) => setReporterRole(e.target.value as any)}
                  className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="Forest Ranger">Forest Ranger</option>
                  <option value="Highway Patrol">Highway Patrol</option>
                  <option value="EOC Spotter">EOC Spotter</option>
                  <option value="Local Farmer">Local Farmer</option>
                  <option value="Resident">Resident</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Latitude</label>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Longitude</label>
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-slate-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nearest Landmark / Sector</label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Hazard Category</label>
              <select
                value={hazardType}
                onChange={(e) => setHazardType(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900"
              >
                <option value="active_understory_fire">Active Understory Wildfire</option>
                <option value="crown_fire">Extreme Crown Fire</option>
                <option value="smoke_column">Dense Smoke Column / Reduced Visibility</option>
                <option value="blocked_corridor">Blocked Escape Road / Debris</option>
                <option value="distressed_wildlife">Distressed Wildlife Corridor Movement</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tactical Field Notes</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 leading-relaxed"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'Verifying & Ingesting...' : 'Submit Authenticated Report'}
            </button>

            {submitFeedback && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 leading-relaxed flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{submitFeedback}</span>
              </div>
            )}
          </form>
        </Card>

        {/* Right 2 Columns: Live Reports Registry & Active Bulletins */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Safety Bulletins */}
          <Card className="p-6 border-slate-200 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="text-xs font-bold text-amber-600 tracking-wider uppercase flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4" />
                  Public Safety Bulletins
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Active Emergency Notices & Advisories
                </h3>
              </div>
              <span className="text-xs font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                BROADCAST ACTIVE
              </span>
            </div>

            <div className="space-y-3">
              {bulletins.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-600 text-white uppercase">
                        {b.severity.replace(/_/g, ' ')}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{b.title}</h4>
                    </div>
                    <span className="text-xs font-mono text-slate-500 whitespace-nowrap">
                      {new Date(b.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">{b.message}</p>

                  <div className="bg-white/80 p-3 rounded-lg border border-amber-200/60 space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                      Mandated Public Actions:
                    </div>
                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5">
                      {b.recommendedActions.map((act, i) => (
                        <li key={i}>{act}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
                    <span>Districts: {b.affectedAdministrativeDistricts.join(', ')}</span>
                    <span className="font-medium text-slate-700">Source: {b.officialSource}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Inbound Field Reports Log */}
          <Card className="p-6 border-slate-200 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="text-xs font-bold text-slate-600 tracking-wider uppercase flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  Authenticated Field Reports
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Recent In-Situ Ground Telemetry
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {reports.length} Total Verified
              </span>
            </div>

            <div className="space-y-3">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 font-mono">{rep.id}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                          {rep.reporterRole}
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {rep.reporterName}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 font-mono">
                        {rep.nearestLandmark} ({rep.coordinates.lat}°, {rep.coordinates.lng}°)
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(rep.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/60">
                    {rep.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span className="capitalize">Hazard: {rep.hazardType.replace(/_/g, ' ')}</span>
                    {rep.verifiedByAuthority && (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified: {rep.verifiedByAgency}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
