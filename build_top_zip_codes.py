"""
Build top_zip_codes.csv: Zip, City, Growth_Score, Avg_Income, Median_Age.
Uses ACS 5-year profile (DP03, DP05, DP04) for two vintages; growth formula
S = w1*ΔP25_45 + w2*ΔI100k + w3*Hv.
"""
import argparse
import os
import sys
from pathlib import Path

import pandas as pd

from config import (
    CENSUS_API_KEY,
    MIN_POPULATION,
    OUTPUT_CSV,
    TOP_N,
    W1,
    W2,
    W3,
    YEAR_CURRENT,
    YEAR_PRIOR,
    ZIP_CITY_PATH,
)
from fetch_acs import fetch_all


def _safe_pct_change(current: float, prior: float) -> float | None:
    """Return (current - prior) / prior * 100, or None if prior is 0 or missing."""
    try:
        p = float(prior)
        if p == 0:
            return None
        return (float(current) - p) / p * 100
    except (TypeError, ValueError):
        return None


def _p25_44(row: pd.Series) -> float:
    """Sum population 25-44 from DP05 age group columns."""
    total = 0
    for col in ["DP05_0010E", "DP05_0011E", "DP05_0012E", "DP05_0013E"]:
        if col in row:
            try:
                total += float(row[col] or 0)
            except (TypeError, ValueError):
                pass
    return total


def _households_100k_plus(row: pd.Series) -> float:
    """Sum households $100k+ from DP03 columns."""
    total = 0
    for col in ["DP03_0064E", "DP03_0065E", "DP03_0066E"]:
        if col in row:
            try:
                total += float(row[col] or 0)
            except (TypeError, ValueError):
                pass
    return total


def _housing_units(row: pd.Series) -> float:
    """Total housing units from DP04."""
    if "DP04_0001E" in row:
        try:
            return float(row["DP04_0001E"] or 0)
        except (TypeError, ValueError):
            pass
    a = float(row.get("DP04_0002E") or 0)
    b = float(row.get("DP04_0003E") or 0)
    return a + b


def compute_growth(current_dfs: dict, prior_dfs: dict) -> pd.DataFrame:
    """Compute growth components and Growth_Score per ZCTA."""
    # Join current DP03, DP05, DP04 on zip code tabulation area
    zcol = "zip code tabulation area"
    if zcol not in (current_dfs.get("DP05") or pd.DataFrame()).columns:
        zcol = "ZIP Code Tabulation Area"
    cur_dp05 = current_dfs.get("DP05") or pd.DataFrame()
    cur_dp03 = current_dfs.get("DP03") or pd.DataFrame()
    cur_dp04 = current_dfs.get("DP04") or pd.DataFrame()
    pri_dp05 = prior_dfs.get("DP05") or pd.DataFrame()
    pri_dp03 = prior_dfs.get("DP03") or pd.DataFrame()
    pri_dp04 = prior_dfs.get("DP04") or pd.DataFrame()
    if cur_dp05.empty or cur_dp03.empty or cur_dp04.empty:
        return pd.DataFrame()
    # Normalize ZCTA column name
    for df in [cur_dp05, cur_dp03, cur_dp04, pri_dp05, pri_dp03, pri_dp04]:
        if "zip code tabulation area" in df.columns:
            df.rename(columns={"zip code tabulation area": "zcta"}, inplace=True)
        elif "ZIP Code Tabulation Area" in df.columns:
            df.rename(columns={"ZIP Code Tabulation Area": "zcta"}, inplace=True)
    cur_dp05 = cur_dp05.rename(columns={c: c.strip() for c in cur_dp05.columns if isinstance(c, str)})
    if "zcta" not in cur_dp05.columns:
        for c in cur_dp05.columns:
            if "zip" in c.lower() or c == "ZCTA":
                cur_dp05 = cur_dp05.rename(columns={c: "zcta"})
                break
    zcol = "zcta"
    cur_dp03 = cur_dp03.rename(columns={k: k.strip() if isinstance(k, str) else k for k in cur_dp03.columns})
    if zcol not in cur_dp03.columns and "zip code tabulation area" in str(cur_dp03.columns).lower():
        for c in cur_dp03.columns:
            if "zip" in str(c).lower():
                cur_dp03 = cur_dp03.rename(columns={c: zcol})
                break
    cur_dp04 = cur_dp04.rename(columns={k: k.strip() if isinstance(k, str) else k for k in cur_dp04.columns})
    if zcol not in cur_dp04.columns:
        for c in cur_dp04.columns:
            if "zip" in str(c).lower():
                cur_dp04 = cur_dp04.rename(columns={c: zcol})
                break
    for df in [pri_dp05, pri_dp03, pri_dp04]:
        for c in df.columns:
            if "zip" in str(c).lower():
                df.rename(columns={c: zcol}, inplace=True)
                break
    cur_dp05[zcol] = cur_dp05[zcol].astype(str).str.zfill(5)
    cur_dp03[zcol] = cur_dp03[zcol].astype(str).str.zfill(5)
    cur_dp04[zcol] = cur_dp04[zcol].astype(str).str.zfill(5)
    pri_dp05[zcol] = pri_dp05[zcol].astype(str).str.zfill(5)
    pri_dp03[zcol] = pri_dp03[zcol].astype(str).str.zfill(5)
    pri_dp04[zcol] = pri_dp04[zcol].astype(str).str.zfill(5)

    cur_dp05["P25_44"] = cur_dp05.apply(_p25_44, axis=1)
    cur_dp05["total_pop"] = cur_dp05.get("DP05_0001E", pd.Series(0)).astype(float).fillna(0)
    cur_dp05["median_age"] = cur_dp05.get("DP05_0018E", pd.Series()).astype(float, errors="ignore")
    pri_dp05["P25_44"] = pri_dp05.apply(_p25_44, axis=1)
    cur_dp03["hh_100k"] = cur_dp03.apply(_households_100k_plus, axis=1)
    cur_dp03["total_hh"] = cur_dp03.get("DP03_0052E", pd.Series(0)).astype(float).fillna(0)
    cur_dp03["mean_income"] = cur_dp03.get("DP03_0062E", pd.Series()).astype(float, errors="ignore")
    pri_dp03["hh_100k"] = pri_dp03.apply(_households_100k_plus, axis=1)
    pri_dp03["total_hh"] = pri_dp03.get("DP03_0052E", pd.Series(0)).astype(float).fillna(0)
    cur_dp04["housing_units"] = cur_dp04.apply(_housing_units, axis=1)
    pri_dp04["housing_units"] = pri_dp04.apply(_housing_units, axis=1)

    merge_on = [zcol]
    cur = cur_dp05[[zcol, "P25_44", "total_pop", "median_age"]].merge(
        cur_dp03[[zcol, "hh_100k", "total_hh", "mean_income"]], on=zcol, how="outer"
    ).merge(cur_dp04[[zcol, "housing_units"]], on=zcol, how="outer")
    pri = pri_dp05[[zcol, "P25_44"]].merge(pri_dp03[[zcol, "hh_100k", "total_hh"]], on=zcol, how="outer").merge(
        pri_dp04[[zcol, "housing_units"]], on=zcol, how="outer", suffixes=("", "_pri")
    )
    pri = pri.rename(columns={"P25_44": "P25_44_pri", "hh_100k": "hh_100k_pri", "total_hh": "total_hh_pri", "housing_units": "housing_units_pri"})
    df = cur.merge(pri, on=zcol, how="inner")

    df["delta_P25_45"] = df.apply(
        lambda r: _safe_pct_change(r["P25_44"], r.get("P25_44_pri")), axis=1
    )
    # ΔI100k: % change in share (or count) of households $100k+
    df["share_100k_cur"] = df.apply(
        lambda r: (r["hh_100k"] / r["total_hh"] * 100) if r.get("total_hh") and float(r["total_hh"]) else None,
        axis=1,
    )
    df["share_100k_pri"] = df.apply(
        lambda r: (r["hh_100k_pri"] / r["total_hh_pri"] * 100) if r.get("total_hh_pri") and float(r["total_hh_pri"]) else None,
        axis=1,
    )
    df["delta_I100k"] = df.apply(
        lambda r: _safe_pct_change(r["share_100k_cur"], r["share_100k_pri"]) if r.get("share_100k_pri") is not None else None,
        axis=1,
    )
    df["Hv"] = df.apply(
        lambda r: _safe_pct_change(r["housing_units"], r.get("housing_units_pri")), axis=1
    )

    df["Growth_Score"] = (
        W1 * df["delta_P25_45"].fillna(0)
        + W2 * df["delta_I100k"].fillna(0)
        + W3 * df["Hv"].fillna(0)
    )
    df = df.rename(columns={zcol: "Zip", "mean_income": "Avg_Income", "median_age": "Median_Age"})
    return df


def load_zip_city(path: str) -> pd.DataFrame | None:
    """Load ZIP->City table from CSV (columns: zip/ZIP and city/City)."""
    if not path or not os.path.isfile(path):
        return None
    try:
        d = pd.read_csv(path)
        d.columns = [c.strip().lower() for c in d.columns]
        zip_col = "zip" if "zip" in d.columns else "zcta"
        city_col = "city" if "city" in d.columns else "primary_city"
        if zip_col not in d.columns:
            zip_col = [c for c in d.columns if "zip" in c or c == "zcta"][:1]
            zip_col = zip_col[0] if zip_col else None
        if city_col not in d.columns:
            city_col = [c for c in d.columns if "city" in c or "place" in c][:1]
            city_col = city_col[0] if city_col else None
        if zip_col and city_col:
            return d[[zip_col, city_col]].drop_duplicates(zip_col).rename(columns={zip_col: "Zip", city_col: "City"})
    except Exception:
        pass
    return None


def main():
    parser = argparse.ArgumentParser(description="Build top_zip_codes.csv from ACS 5-year data")
    parser.add_argument("--no-fetch", action="store_true", help="Use cached CSVs in data/ if present")
    parser.add_argument("--output", "-o", default=str(OUTPUT_CSV), help="Output CSV path")
    args = parser.parse_args()

    if not CENSUS_API_KEY and not args.no_fetch:
        print("Set CENSUS_API_KEY (https://api.census.gov/data/key_signup.html)", file=sys.stderr)
        sys.exit(1)

    if abs(W1 + W2 + W3 - 1.0) > 1e-6:
        print("Weights w1, w2, w3 must sum to 1", file=sys.stderr)
        sys.exit(1)

    current_dfs, prior_dfs = {}, {}
    if args.no_fetch:
        data_dir = Path(__file__).resolve().parent / "data"
        for year, d in [(YEAR_CURRENT, current_dfs), (YEAR_PRIOR, prior_dfs)]:
            for profile in ["DP03", "DP05", "DP04"]:
                p = data_dir / f"acs5_profile_{profile}_{year}.csv"
                if p.exists():
                    d[profile] = pd.read_csv(p)
        if not current_dfs or not prior_dfs:
            print("Run without --no-fetch first to populate data/", file=sys.stderr)
            sys.exit(1)
    else:
        current_dfs, prior_dfs = fetch_all()
        data_dir = Path(__file__).resolve().parent / "data"
        data_dir.mkdir(exist_ok=True)
        for year, d in [(YEAR_CURRENT, current_dfs), (YEAR_PRIOR, prior_dfs)]:
            for profile, df in d.items():
                if not df.empty:
                    df.to_csv(data_dir / f"acs5_profile_{profile}_{year}.csv", index=False)

    growth_df = compute_growth(current_dfs, prior_dfs)
    if growth_df.empty:
        print("No growth data computed", file=sys.stderr)
        sys.exit(1)

    # Filter by min population
    if "total_pop" in growth_df.columns:
        growth_df = growth_df[growth_df["total_pop"].fillna(0) >= MIN_POPULATION]
    out = growth_df[["Zip", "Growth_Score", "Avg_Income", "Median_Age"]].copy()
    out["City"] = ""

    zip_city = load_zip_city(ZIP_CITY_PATH)
    if zip_city is not None:
        out["Zip"] = out["Zip"].astype(str).str.zfill(5)
        zip_city["Zip"] = zip_city["Zip"].astype(str).str.zfill(5)
        out = out.drop(columns=["City"]).merge(zip_city, on="Zip", how="left")
        out["City"] = out["City"].fillna("")
    else:
        out = out[["Zip", "City", "Growth_Score", "Avg_Income", "Median_Age"]]

    out = out.sort_values("Growth_Score", ascending=False)
    if TOP_N > 0:
        out = out.head(TOP_N)
    out = out[["Zip", "City", "Growth_Score", "Avg_Income", "Median_Age"]]
    out.to_csv(args.output, index=False)
    print(f"Wrote {len(out)} rows to {args.output}")


if __name__ == "__main__":
    main()
