#!/usr/bin/env python3
"""
FireLens Scientific Audit — Independent Headline Metrics Reproduction Protocol
NASA Space Apps Challenge 2026

Independent scientific replication script executed outside the TypeScript runtime.
Computes raw observations, adjusted fire activity rates, observation effort indices,
causal attribution percentage, cohort bootstrap confidence intervals, and MCD64A1 concordance.
"""

import json
import math
import hashlib
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
DATA_OBS = ROOT / "dataset" / "firelens_nilgiris_2019_2026.json" if (ROOT / "dataset" / "firelens_nilgiris_2019_2026.json").exists() else ROOT / "data" / "firelens_nilgiris_2019_2026.json"
DATA_MCD = ROOT / "dataset" / "firelens_validation_mcd64a1.json" if (ROOT / "dataset" / "firelens_validation_mcd64a1.json").exists() else ROOT / "data" / "firelens_validation_mcd64a1.json"
OUT_JSON = ROOT / "research" / "scientific_audit" / "reproduction_output.json"

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def main():
    obs_hash = sha256_file(DATA_OBS)
    mcd_hash = sha256_file(DATA_MCD)

    with open(DATA_OBS, "r") as f:
        observations = json.load(f)

    with open(DATA_MCD, "r") as f:
        mcd64 = json.load(f)

    # 1. Group observations by year
    by_year = {}
    for o in observations:
        yr = int(o["acquisitionTimestampUtc"][:4])
        by_year.setdefault(yr, []).append(o)

    years = sorted(by_year.keys())
    yearly_summaries = []

    for yr in years:
        obs = by_year[yr]
        total = len(obs)
        modis = sum(1 for o in obs if o["sensor"] == "MODIS")
        viirs = sum(1 for o in obs if o["sensor"] == "VIIRS")
        snpp = sum(1 for o in obs if o["satellite"] == "Suomi-NPP")
        noaa20 = sum(1 for o in obs if o["satellite"] == "NOAA-20")
        noaa21 = sum(1 for o in obs if o["satellite"] == "NOAA-21")
        day = sum(1 for o in obs if o["dayNight"] == "D")
        night = sum(1 for o in obs if o["dayNight"] == "N")
        nadir = sum(1 for o in obs if o["viewZenithBin"] == "nadir_0_20")
        limb = sum(1 for o in obs if o["viewZenithBin"] == "limb_45_65")

        frp_vals = [o["frpMw"] for o in obs if o["frpMw"] is not None and not math.isnan(o["frpMw"])]
        mean_frp = round(sum(frp_vals) / len(frp_vals), 2) if frp_vals else 0.0
        total_frp = round(sum(frp_vals), 1)

        # Effort Index model:
        # C = 1.25 if NOAA-21 present or yr >= 2023 else 1.0
        has_noaa21 = noaa21 > 0 or yr >= 2023
        constellation_factor = 1.25 if has_noaa21 else 1.0
        viirs_frac = viirs / total if total > 0 else 0.0
        sensitivity_factor = 1.0 + viirs_frac * 2.2
        drift_factor = 0.92 if yr >= 2024 else 1.0

        effort_idx = round(constellation_factor * sensitivity_factor * drift_factor, 3)
        adj_hotspots = round(total / max(0.1, effort_idx))

        yearly_summaries.append({
            "year": yr,
            "totalHotspots": total,
            "modisCount": modis,
            "viirsCount": viirs,
            "snppCount": snpp,
            "noaa20Count": noaa20,
            "noaa21Count": noaa21,
            "daytimeCount": day,
            "nighttimeCount": night,
            "nadirCount": nadir,
            "limbCount": limb,
            "meanFrpMw": mean_frp,
            "totalFrpMw": total_frp,
            "effortIndex": effort_idx,
            "adjustedHotspots": adj_hotspots,
        })

    # 2. Baseline (2019-2021) and Modern (2023-2026) Cohorts
    baseline = [y for y in yearly_summaries if 2019 <= y["year"] <= 2021]
    modern = [y for y in yearly_summaries if 2023 <= y["year"] <= 2026]

    b_raw_sum = sum(y["totalHotspots"] for y in baseline)
    c_raw_sum = sum(y["totalHotspots"] for y in modern)
    b_raw_avg = b_raw_sum / len(baseline)
    c_raw_avg = c_raw_sum / len(modern)
    apparent_growth_pct = round(((c_raw_avg - b_raw_avg) / b_raw_avg) * 100, 1)

    b_adj_sum = sum(y["adjustedHotspots"] for y in baseline)
    c_adj_sum = sum(y["adjustedHotspots"] for y in modern)
    b_adj_avg = b_adj_sum / len(baseline)
    c_adj_avg = c_adj_sum / len(modern)
    adj_growth_pct = round(((c_adj_avg - b_adj_avg) / b_adj_avg) * 100, 1)

    # Attribution
    raw_delta = max(0.1, c_raw_avg - b_raw_avg)
    true_delta = max(0.0, c_adj_avg - b_adj_avg)
    effort_delta = max(0.0, raw_delta - true_delta)
    effort_attrib_pct = round(min(100.0, max(0.0, (effort_delta / raw_delta) * 100)), 1)
    burning_attrib_pct = round(100.0 - effort_attrib_pct, 1)

    # 3. Monte Carlo Cohort Bootstrap Resampling (B = 1,000)
    random.seed(42)
    b_counts = [y["totalHotspots"] for y in baseline]
    b_efforts = [y["effortIndex"] for y in baseline]
    c_counts = [y["totalHotspots"] for y in modern]
    c_efforts = [y["effortIndex"] for y in modern]

    iterations = 1000
    bootstrap_attributions = []
    nb = len(b_counts)
    nc = len(c_counts)

    for _ in range(iterations):
        # Sample baseline cohort with replacement
        b_s = [random.choice(list(zip(b_counts, b_efforts))) for _ in range(nb)]
        b_mean_raw = sum(x[0] for x in b_s) / nb
        b_mean_adj = sum(x[0] / x[1] for x in b_s) / nb

        # Sample modern cohort with replacement
        c_s = [random.choice(list(zip(c_counts, c_efforts))) for _ in range(nc)]
        c_mean_raw = sum(x[0] for x in c_s) / nc
        c_mean_adj = sum(x[0] / x[1] for x in c_s) / nc

        r_delta = c_mean_raw - b_mean_raw
        a_delta = c_mean_adj - b_mean_adj

        if r_delta > 0:
            eff_frac = max(0.0, min(1.0, (r_delta - max(0.0, a_delta)) / r_delta))
            bootstrap_attributions.append(eff_frac * 100.0)
        else:
            bootstrap_attributions.append(100.0)

    bootstrap_attributions.sort()
    lower_idx = int(iterations * 0.025)
    median_idx = int(iterations * 0.500)
    upper_idx = int(iterations * 0.975)

    ci_lower = round(bootstrap_attributions[lower_idx], 1)
    ci_median = round(bootstrap_attributions[median_idx], 1)
    ci_upper = round(bootstrap_attributions[upper_idx], 1)

    # 4. Leave-One-Year-Out Sensitivity Analysis
    loyo_results = {}
    # Drop one baseline year
    for drop_yr in [2019, 2020, 2021]:
        sub_b = [y for y in baseline if y["year"] != drop_yr]
        sub_b_raw = sum(y["totalHotspots"] for y in sub_b) / len(sub_b)
        sub_b_adj = sum(y["adjustedHotspots"] for y in sub_b) / len(sub_b)
        rd = max(0.1, c_raw_avg - sub_b_raw)
        ad = max(0.0, c_adj_avg - sub_b_adj)
        attrib = round(min(100.0, max(0.0, (max(0.0, rd - ad) / rd) * 100)), 1)
        loyo_results[f"exclude_{drop_yr}"] = {
            "b_raw_avg": round(sub_b_raw, 1),
            "raw_growth_pct": round(((c_raw_avg - sub_b_raw) / sub_b_raw) * 100, 1),
            "effort_attrib_pct": attrib
        }

    # Drop one modern year
    for drop_yr in [2023, 2024, 2025, 2026]:
        sub_c = [y for y in modern if y["year"] != drop_yr]
        sub_c_raw = sum(y["totalHotspots"] for y in sub_c) / len(sub_c)
        sub_c_adj = sum(y["adjustedHotspots"] for y in sub_c) / len(sub_c)
        rd = max(0.1, sub_c_raw - b_raw_avg)
        ad = max(0.0, sub_c_adj - b_adj_avg)
        attrib = round(min(100.0, max(0.0, (max(0.0, rd - ad) / rd) * 100)), 1)
        loyo_results[f"exclude_{drop_yr}"] = {
            "c_raw_avg": round(sub_c_raw, 1),
            "raw_growth_pct": round(((sub_c_raw - b_raw_avg) / b_raw_avg) * 100, 1),
            "effort_attrib_pct": attrib
        }

    # 5. MCD64A1 Concordance
    paired = []
    for y in yearly_summaries:
        m_matches = [m for m in mcd64 if m["monthYear"].startswith(str(y["year"]))]
        if m_matches:
            tot_ha = sum(m["burnedAreaHectares"] for m in m_matches)
            paired.append({"year": y["year"], "raw": y["totalHotspots"], "adj": y["adjustedHotspots"], "ba_ha": tot_ha})

    def calc_r2(x, y):
        n = len(x)
        if n < 3: return 0.0
        mx, my = sum(x) / n, sum(y) / n
        num = sum((xi - mx) * (yi - my) for xi, yi in zip(x, y))
        den_x = sum((xi - mx) ** 2 for xi in x)
        den_y = sum((yi - my) ** 2 for yi in y)
        if den_x == 0 or den_y == 0: return 0.0
        r = num / math.sqrt(den_x * den_y)
        return round(r * r, 3)

    raw_r2 = calc_r2([p["raw"] for p in paired], [p["ba_ha"] for p in paired])
    adj_r2 = calc_r2([p["adj"] for p in paired], [p["ba_ha"] for p in paired])

    # 6. Assemble Output
    output = {
        "metadata": {
            "dataset_sha256": obs_hash,
            "validation_sha256": mcd_hash,
            "observations_count": len(observations),
            "mcd64_periods_count": len(mcd64),
            "temporal_coverage": "2019-02-15 to 2026-04-25 (Peak Dry Fire Season)",
            "aoi_bbox": [76.2, 11.0, 77.3, 12.0],
        },
        "yearly_summaries": yearly_summaries,
        "headline_metrics": {
            "baseline_raw_annual_avg": round(b_raw_avg, 1),
            "modern_raw_annual_avg": round(c_raw_avg, 1),
            "apparent_growth_pct": apparent_growth_pct,
            "baseline_adj_annual_avg": round(b_adj_avg, 1),
            "modern_adj_annual_avg": round(c_adj_avg, 1),
            "adjusted_true_growth_pct": adj_growth_pct,
            "attributable_to_effort_pct": effort_attrib_pct,
            "attributable_to_burning_pct": burning_attrib_pct,
            "bootstrap_95_ci": {
                "lower_pct": ci_lower,
                "median_pct": ci_median,
                "upper_pct": ci_upper,
                "iterations": iterations,
            },
            "mcd64a1_concordance": {
                "raw_r2": raw_r2,
                "adjusted_r2": adj_r2,
                "paired_years_count": len(paired),
            }
        },
        "leave_one_year_out_sensitivity": loyo_results,
    }

    with open(OUT_JSON, "w") as f:
        json.dump(output, f, indent=2)

    print("REPRODUCTION COMPLETE:")
    print(f"  Observed Baseline Raw Avg: {b_raw_avg:.1f}")
    print(f"  Observed Modern Raw Avg:   {c_raw_avg:.1f}")
    print(f"  Apparent Growth:           +{apparent_growth_pct}%")
    print(f"  Adjusted Baseline Avg:     {b_adj_avg:.1f}")
    print(f"  Adjusted Modern Avg:       {c_adj_avg:.1f}")
    print(f"  Adjusted True Growth:      +{adj_growth_pct}%")
    print(f"  Effort Attribution:        {effort_attrib_pct}%")
    print(f"  Bootstrap 95% CI:          [{ci_lower}%, {ci_upper}%] (median: {ci_median}%)")
    print(f"  MCD64A1 Raw R2:            {raw_r2}")
    print(f"  MCD64A1 Adjusted R2:       {adj_r2}")
    print(f"  Saved to: {OUT_JSON}")

if __name__ == "__main__":
    main()

