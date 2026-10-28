# ZIP-area coordinate data

Source: U.S. Census Bureau, 2026 Gazetteer ZIP Code Tabulation Areas, downloaded October 28, 2026.

https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html
https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2026_Gazetteer/2026_Gaz_zcta_national.zip

The JSON maps five-digit GEOID to [INTPTLAT, INTPTLONG]. It contains 33791 representative ZIP-area points. ZIP Code Tabulation Areas approximate ZIP areas; they do not cover every USPS delivery/PO-box/unique ZIP. Distances are straight-line estimates, not driving distances or exact home locations. No user data is transmitted to Census or another geocoding service.

## College location fallback

NCES IPEDS HD2024 institutional directory: https://nces.ed.gov/ipeds/datacenter/data/HD2024.zip (downloaded October 28, 2026). Public institutional names, aliases, state/city, website hostname, ZIP and campus coordinates only. The bundled directory is used when a college has no usable saved location. Matching requires a unique institution/campus from name and state/city or an unambiguous institutional hostname. Ambiguous campuses remain unresolved. No player data is sent externally and no production records are modified.
