import React from 'react';
import { ClaimVerificationStatus, RiskSeverity, VerificationLevel } from './types';

export function formatVerificationLabel(level: VerificationLevel): {
  label: string;
  shortLabel: string;
  glyph: string;
  toneClass: string;
  description: string;
} {
  switch (level) {
    case 'authority_confirmed_emergency':
      return {
        label: 'Authority-Confirmed Emergency',
        shortLabel: 'Authority Emergency',
        glyph: '◆',
        toneClass: 'text-rose-700',
        description: 'Formally declared by District Emergency Operations Centre or statutory authority.',
      };
    case 'field_confirmed':
      return {
        label: 'Field-Confirmed Incident',
        shortLabel: 'Field Confirmed',
        glyph: '▲',
        toneClass: 'text-orange-700',
        description: 'Visually verified on the ground by authorised forest rangers or fire personnel.',
      };
    case 'independently_corroborated':
      return {
        label: 'Independently Corroborated Incident',
        shortLabel: 'Corroborated',
        glyph: '●',
        toneClass: 'text-amber-700',
        description: 'Corroborated across independent satellite sensors (MODIS + VIIRS) or ground telemetry.',
      };
    case 'candidate_incident':
      return {
        label: 'Candidate Incident (Awaiting Field Check)',
        shortLabel: 'Candidate Incident',
        glyph: '◐',
        toneClass: 'text-sky-700',
        description: 'Multi-pixel thermal cluster requiring field or secondary pass confirmation.',
      };
    case 'satellite_thermal_anomaly':
    default:
      return {
        label: 'Unverified Satellite Thermal Anomaly',
        shortLabel: 'Thermal Anomaly',
        glyph: '○',
        toneClass: 'text-slate-600',
        description: 'Single-pass raw thermal detection; may represent industrial heat, solar glint, or controlled burn.',
      };
  }
}

export function formatSeverityLabel(severity: RiskSeverity): {
  label: string;
  glyph: string;
  toneClass: string;
} {
  switch (severity) {
    case 'critical':
      return { label: 'Critical Risk', glyph: '✖', toneClass: 'text-rose-700' };
    case 'high':
      return { label: 'High Risk', glyph: '▲', toneClass: 'text-orange-700' };
    case 'elevated':
      return { label: 'Elevated Risk', glyph: '◆', toneClass: 'text-amber-700' };
    case 'moderate':
      return { label: 'Moderate Risk', glyph: '●', toneClass: 'text-sky-700' };
    case 'low':
    default:
      return { label: 'Low Risk', glyph: '○', toneClass: 'text-slate-600' };
  }
}

export function formatClaimStatus(status: ClaimVerificationStatus): {
  label: string;
  glyph: string;
  toneClass: string;
} {
  switch (status) {
    case 'verified_official':
      return {
        label: 'Verified Official Information',
        glyph: '◆',
        toneClass: 'text-emerald-700',
      };
    case 'independently_corroborated':
      return {
        label: 'Independently Corroborated Report',
        glyph: '●',
        toneClass: 'text-sky-700',
      };
    case 'ai_interpretation':
      return {
        label: 'ALEX Modelled Synthesis (AI)',
        glyph: '◇',
        toneClass: 'text-indigo-700',
      };
    case 'unverified_claim':
    default:
      return {
        label: 'Unverified Claim (Treat with Caution)',
        glyph: '△',
        toneClass: 'text-amber-700',
      };
  }
}

export const SectionHeader: React.FC<{
  kicker?: string;
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ kicker, title, subtitle, rightSlot, action }) => {
  const slot = rightSlot || action;
  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3.5 pb-4 sm:pb-5 border-b border-slate-200/80">
      <div className="min-w-0">
        {kicker && (
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 mb-1">
            {kicker}
          </p>
        )}
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight text-slate-900 leading-snug">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {slot && (
        <div className="w-full lg:w-auto overflow-x-auto no-scrollbar shrink-0">
          {slot}
        </div>
      )}
    </div>
  );
};

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div
    className={`rounded-2xl border bg-white ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const ProvenanceNoticeBanner: React.FC<{
  modeLabel?: string;
  detail: string;
}> = ({
  modeLabel = 'Demonstration Telemetry Mode',
  detail,
}) => (
  <div className="bg-slate-100/90 border border-slate-200/90 rounded-xl px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 text-xs text-slate-600">
    <div className="min-w-0 leading-relaxed">
      <span className="font-mono font-semibold text-slate-800">{modeLabel}</span>
      <span aria-hidden="true" className="mx-1.5">·</span>
      <span>{detail}</span>
    </div>
    <span className="font-mono text-[11px] text-slate-500 shrink-0">
      Adapter: Typed Telemetry v3.4
    </span>
  </div>
);
