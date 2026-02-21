"""
Fetch ACS 5-year profile data at ZCTA level for two vintages.
Uses Census profile API (requests); loops by state to avoid limits.
"""
import time
import requests
import pandas as pd

import us
from config import CENSUS_API_KEY, YEAR_CURRENT, YEAR_PRIOR

# ACS 5-year profile variable codes (DP03 Income, DP05 Age, DP04 Housing)
# DP03: Total households, Mean household income, Households $100k-$150k, $150k-$200k, $200k+
DP03_VARS = [
    "DP03_0052E",   # Total households
    "DP03_0062E",   # Mean household income (dollars)
    "DP03_0064E",   # $100,000 to $149,999 (Total households)
    "DP03_0065E",   # $150,000 to $199,999
    "DP03_0066E",   # $200,000 or more
]
# DP05: Total population, Age 25-29, 30-34, 35-39, 40-44, Median age
DP05_VARS = [
    "DP05_0001E",   # Total population
    "DP05_0010E",   # 25 to 29 years
    "DP05_0011E",   # 30 to 34 years
    "DP05_0012E",   # 35 to 39 years
    "DP05_0013E",   # 40 to 44 years
    "DP05_0018E",   # Median age (years)
]
# DP04: Total housing units (0001) or occupied+vacant
DP04_VARS = [
    "DP04_0001E",   # Total housing units (HOUSING OCCUPANCY)
]
# Fallback if 0001 not available
DP04_VARS_ALT = ["DP04_0002E", "DP04_0003E"]  # Occupied, Vacant

BASE = "https://api.census.gov/data"


def _profile_url(year: int, get_vars: list, state_fips: str | None) -> str:
    get_str = ",".join(["NAME"] + get_vars)
    params = {"get": get_str, "key": CENSUS_API_KEY}
    if state_fips is not None:
        params["for"] = "zip code tabulation area"
        params["in"] = f"state:{state_fips}"
    else:
        params["for"] = "zip code tabulation area:*"
    return f"{BASE}/{year}/acs/acs5/profile"


def _fetch_profile(year: int, get_vars: list) -> pd.DataFrame:
    """Fetch profile data for all ZCTAs; loop by state to avoid row limit."""
    url = _profile_url(year, get_vars, None)
    all_rows = []
    # Try US-level first (for=zip code tabulation area:*)
    try:
        r = requests.get(url, params={"get": ",".join(["NAME"] + get_vars), "for": "zip code tabulation area:*", "key": CENSUS_API_KEY}, timeout=120)
        r.raise_for_status()
        data = r.json()
        if len(data) > 1:
            headers = data[0]
            for row in data[1:]:
                all_rows.append(dict(zip(headers, row)))
            return pd.DataFrame(all_rows)
    except Exception as e:
        pass  # fall back to state loop
    # Loop by state
    for state in us.STATES:
        if state.fips in ("60", "66", "69", "78"):  # territories, skip if desired
            continue
        try:
            r = requests.get(
                f"{BASE}/{year}/acs/acs5/profile",
                params={
                    "get": ",".join(["NAME"] + get_vars),
                    "for": "zip code tabulation area:*",
                    "in": f"state:{state.fips}",
                    "key": CENSUS_API_KEY,
                },
                timeout=60,
            )
            r.raise_for_status()
            data = r.json()
            headers = data[0]
            for row in data[1:]:
                all_rows.append(dict(zip(headers, row)))
        except Exception as e:
            print(f"Warning: state {state.fips} ({state.name}): {e}")
        time.sleep(0.2)
    return pd.DataFrame(all_rows)


def fetch_vintage(year: int) -> dict[str, pd.DataFrame]:
    """Fetch DP03, DP05, DP04 for one ACS 5-year vintage at ZCTA level."""
    out = {}
    for label, vars_list in [("DP03", DP03_VARS), ("DP05", DP05_VARS), ("DP04", DP04_VARS)]:
        try:
            df = _fetch_profile(year, vars_list)
            if df.empty:
                if label == "DP04" and DP04_VARS_ALT:
                    df = _fetch_profile(year, DP04_VARS_ALT)
                    if not df.empty:
                        df["DP04_0001E"] = df["DP04_0002E"].astype(float).fillna(0) + df["DP04_0003E"].astype(float).fillna(0)
            out[label] = df
        except Exception as e:
            print(f"Error fetching {label} {year}: {e}")
            out[label] = pd.DataFrame()
    return out


def fetch_all() -> tuple[dict[str, pd.DataFrame], dict[str, pd.DataFrame]]:
    """Fetch current and prior vintages."""
    current = fetch_vintage(YEAR_CURRENT)
    prior = fetch_vintage(YEAR_PRIOR)
    return current, prior
