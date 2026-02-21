# ACS-Based ZIP Code Growth Score

Produces **top_zip_codes.csv** with columns: **Zip**, **City**, **Growth_Score**, **Avg_Income**, **Median_Age**, using Census ACS 5-year profile data (DP03 Income, DP05 Age, DP04 Housing) for two vintages.

## Growth formula

`S = w1·ΔP25_45 + w2·ΔI100k + w3·Hv`

- **ΔP25_45**: % change in population age 25–44 (current vs prior 5-year vintage)
- **ΔI100k**: % change in share of households earning $100k+ (same two vintages)
- **Hv**: Housing velocity = % change in total housing units (same two vintages)
- **w1, w2, w3**: Weights (configurable; must sum to 1; default 1/3 each)

## Setup

1. **Python**: 3.8+

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Census API key** (required for fetching):
   - Get a free key at [api.census.gov/data/key_signup.html](https://api.census.gov/data/key_signup.html)
   - Set it before running:
     ```bash
     export CENSUS_API_KEY=your_key_here
     ```

## Run

```bash
python build_top_zip_codes.py
```

Output is written to **top_zip_codes.csv** in the project directory.

- **Cached fetch**: Raw ACS data is saved under `data/` (by vintage and profile). Use `--no-fetch` to rebuild the CSV from cache without calling the API again.
- **Output path**: `python build_top_zip_codes.py -o path/to/out.csv`

## Configuration (environment)

| Variable | Default | Description |
|----------|---------|--------------|
| `CENSUS_API_KEY` | (required) | Census API key |
| `YEAR_CURRENT` | 2023 | Current ACS 5-year vintage |
| `YEAR_PRIOR` | 2018 | Prior ACS 5-year vintage (for % changes) |
| `W1`, `W2`, `W3` | 0.333, 0.333, 0.334 | Growth score weights (must sum to 1) |
| `ZIP_CITY_PATH` | (empty) | Path to CSV with ZIP and City columns for lookup |
| `MIN_POPULATION` | 500 | Drop ZCTAs with population below this |
| `TOP_N` | 0 | If &gt; 0, keep only top N rows by Growth_Score |

## City column

Census ZCTA (ZIP) data does not include a city name. To fill **City**:

1. Set **ZIP_CITY_PATH** to a CSV that has a ZIP column (e.g. `zip` or `ZCTA`) and a city column (e.g. `city` or `primary_city`). The script joins on ZIP and fills City.
2. Example source: [SimpleMaps free US ZIP database](https://simplemaps.com/data/us-zips) (ZIP + primary city). Download and point `ZIP_CITY_PATH` to the CSV path.
3. If **ZIP_CITY_PATH** is not set, **City** is left blank.

## Deliverable

- **top_zip_codes.csv**: Zip, City, Growth_Score, Avg_Income, Median_Age (sorted by Growth_Score descending; optional min population and top-N filter).
