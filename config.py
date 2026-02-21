"""
Configuration for ACS growth score pipeline.
Census API key from CENSUS_API_KEY env; vintages, weights, and optional ZIP-city path.
"""
import os
from pathlib import Path

# Census API key (required); get one at https://api.census.gov/data/key_signup.html
CENSUS_API_KEY = os.environ.get("CENSUS_API_KEY", "")

# ACS 5-year vintages for growth (current vs prior)
YEAR_CURRENT = int(os.environ.get("YEAR_CURRENT", "2023"))
YEAR_PRIOR = int(os.environ.get("YEAR_PRIOR", "2018"))

# Growth score weights (must sum to 1)
# w1 = ΔP25_45, w2 = ΔI100k, w3 = Hv
W1 = float(os.environ.get("W1", "0.333"))
W2 = float(os.environ.get("W2", "0.333"))
W3 = float(os.environ.get("W3", "0.334"))

# Optional: path or URL to CSV with columns including ZIP and City for lookup
# If None, City will be left empty
ZIP_CITY_PATH = os.environ.get("ZIP_CITY_PATH", "")

# Output
OUTPUT_CSV = Path(__file__).resolve().parent / "top_zip_codes.csv"

# Optional: min population to include (avoid noisy growth)
MIN_POPULATION = int(os.environ.get("MIN_POPULATION", "500"))

# Optional: top N by growth score (0 = all)
TOP_N = int(os.environ.get("TOP_N", "0"))
