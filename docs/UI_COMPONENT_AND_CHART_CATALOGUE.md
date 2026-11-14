# FIRELENS UI COMPONENT & CHART CATALOGUE
**NASA Space Apps Challenge 2026: Harmonization of MODIS and VIIRS Hot Spots**
**Document ID**: CATALOGUE-UI-2026-v3  
**Status**: Formally Documented Reference  

---

## 1. Design Language & Aesthetic Standard: White Minimalistic Scientific UI

FireLens adheres to a **White Minimalistic Scientific UI** standard designed for scientific readability, cartographic precision, and accessibility:
- **Canvas / App Background**: `#FAFBFC` (Subtle off-white)
- **Component & Card Surfaces**: `#FFFFFF` (Pure white)
- **Primary Borders**: `#E2E8F0` / `#CBD5E1` (Clean slate borders)
- **Primary Typography**: `#0F172A` / `#1E293B` (Deep slate, 18px base root)
- **Secondary / Supporting Text**: `#64748B` / `#475569` (Muted slate)
- **Scientific Accent (Brand)**: `#2563EB` (NASA Blue 600)
- **Sensor Palette**:
  - MODIS Terra: `#0284C7` (Cyan / Sky 600)
  - MODIS Aqua: `#2563EB` (Royal Blue 600)
  - VIIRS Suomi-NPP: `#EA580C` (Orange 600)
  - VIIRS NOAA-20: `#D97706` (Amber 600)
  - VIIRS NOAA-21: `#E11D48` (Rose 600)

---

## 2. The 5 Primary Research Workspaces

### Workspace 1: Global Fire Observatory
- **Component**: [CommandDashboardView.tsx](file:///home/justin/Desktop/NASA/src/dashboard/CommandDashboardView.tsx)
- **Purpose**: Real-time Earth observation map and geographic sector monitoring.
- **Key Features**:
  - Interactive 2D scientific canvas and 3D Earth globe (React Three Fiber).
  - Area of Interest (AOI) selection (Nilgiris primary study sector, Sierra, Arcadia, Pantanal).
  - Live satellite feed toggle (`[Live]` vs `[FireLens Archive (13k)]`).
  - Real-time Open-Meteo weather telemetries (soil moisture, CAPE, VPD, Nelson EMC fuel dryness).
  - Floating observation inspector card.

### Workspace 2: Harmonisation Laboratory
- **Component**: [IncidentIntelligenceView.tsx](file:///home/justin/Desktop/NASA/src/incidents/IncidentIntelligenceView.tsx)
- **Purpose**: Multi-sensor pass hypothesis generation and incident dossier intelligence.
- **Key Features**:
  - Instantaneous pass grouping ($\Delta t \le 15$ min, footprint overlap).
  - Peak FRP reporting (strictly preventing cross-pass FRP averaging).
  - Horizontal temporal evidence timeline aggregating satellite passes, field reports, and weather transitions.
  - Transparent `ProvenanceNoticeBanner` on simulation benchmark subtabs.

### Workspace 3: Historical Burning Calendar
- **Component**: [BurningActivityCalendarView.tsx](file:///home/justin/Desktop/NASA/src/fire/BurningActivityCalendarView.tsx)
- **Purpose**: Longitudinal Year $\times$ Month burning activity climatology.
- **Key Features**:
  - 26-year monthly burning matrix (2000–2026).
  - Empirical climatological median curve derived from 13,065 Nilgiris records.
  - Interquartile (25th–75th) and 90th percentile anomaly envelopes.
  - Direct scientific CSV export (`/api/fire/calendar/csv`).

### Workspace 4: Anomaly Intelligence
- **Component**: [FireLensResearchView.tsx](file:///home/justin/Desktop/NASA/src/fire/FireLensResearchView.tsx)
- **Purpose**: Quantitative observing-effort causal decomposition and 4-tier fire reconciliation.
- **Key Features**:
  - **Tab 1 (Source-Native Map)**: Interactive SVG rendering pixel footprints scaled to scan $\times$ track dimensions, with Mudumalai, Bandipur, and Silent Valley boundaries.
  - **Tab 2 (Causal Decomposition)**: Waterfall breakdown table, Poisson rate ratio cards, and MCD64A1 concordance metrics ($R^2 = 0.860$) with explicit seed co-dependence disclosures.
  - **Tab 3 (4-Tier Reconciliation)**: Multi-tier data exploration:
    - Tier 1: Raw Observations table.
    - Tier 2: Coincident Cross-Sensor Matches ($\Delta t \le 30$ min, IoU overlap).
    - Tier 3: Physical Fire Event Clusters with 2D convex hull coordinates, perimeter, duration, and thermal energy ($GWh$).
    - Tier 4: Aggregated climatology and seasonal Z-scores.
  - **Tab 4 (Data Release Card)**: One-click scientific downloads (CSV, GeoJSON, MCD64A1 validation JSON) and recommended formal citation.

### Workspace 5: Scientific Research Explorer
- **Component**: [DataCatalogueView.tsx](file:///home/justin/Desktop/NASA/src/catalogue/DataCatalogueView.tsx)
- **Purpose**: Comprehensive Earth observation registry and instrument metadata catalog.
- **Key Features**:
  - 18+ registered Earth observation and atmospheric sources (MODIS, VIIRS, Sentinel-2 MSI, Landsat-8/9 OLI, Open-Meteo, NIFC WFIGS, GDELT).
  - Detailed channel specifications (MODIS Ch 21/22/31 vs VIIRS Ch I4/I5/M13).
  - Provenance checksum verification and API authentication status.

---

## 3. Specialized Cartographic & Analytical Visualizations

1. **Source-Native Pixel Footprint Canvas**: SVG ellipse geometry representing actual sensor instantaneous field-of-view (IFOV) distortion across viewing zenith angles ($0^\circ–65^\circ$).
2. **Year $\times$ Month Climatology Heatmap**: Multi-tiered color ramp (`#F1F5F9` zero $\rightarrow$ `#FEF3C7` low $\rightarrow$ `#F59E0B` moderate $\rightarrow$ `#DC2626` extreme).
3. **Decomposition Waterfall Table**: Side-by-side progression from raw baseline ($1,532/\text{yr}$) to apparent modern ($1,979/\text{yr}$), through effort multiplier ($3.1\times$), down to normalized true physical burning ($545/\text{yr}$).
4. **2D Convex Hull Fire Event Clustering**: Andrew's monotone chain algorithm tracing outer boundary perimeters around multi-pass physical burning events.
