# Official conference snapshot adapter (HPDC 2027)

Independent from CCF ranks/catalogue. `public/data/hpdc-2027.json` is seeded from
both official pages, fetched and cross-checked on 2026-11-19 UTC. Dates: abstract
2027-01-11, paper 2027-01-18, notification 2027-03-30, AoE (UTC−12).
The official CFP button links to https://hpdc27.hotcrp.com/. `not_found` means only
that, not “submission closed”. `linked` never asserts that submissions are open.

## Refresh and deployment

The existing Pages workflow runs on main pushes, workflow_dispatch, and daily
02:17 UTC / 10:17 Beijing. GitHub may delay scheduled runs. Pages must already
use GitHub Actions as its deployment source. The refresh is in the deployment
job, not a bot commit: no PAT, no contents-write permission, no push-trigger loop.
Checkout does not persist credentials. Public artifact stages only index.html,
css/, js/, public/ and optional existing CNAME/.nojekyll.

Actions cache restores the last saved valid snapshot (including its timestamps).
Timeouts, source disagreement, markup changes, unknown timezone/year, ambiguous
links, or missing dates retain the previous data and verification timestamp,
set failed status, and record the new check time. The frontend warns on failure
or verification older than 3 days. Successful identical data preserves its
original updated_at while advancing verified_at. Writes are atomic.
If cache is evicted/unavailable, the checked-in seed is the fallback. This means
it can be older than a previously deployed cached snapshot; its actual timestamp
is displayed, never relabeled as freshly verified. Update the checked-in seed
occasionally if durable snapshot history is needed. No valid seed plus failed
fetch fails the job rather than deploying invented information.

Sources and fetch destinations are fixed HTTPS URLs. Max response 2 MB, timeout
25 sec per request, redirects rejected. HTML is parsed, not evaluated. Buttons using exactly a literal parent.open('https://…') call are recognized without executing JavaScript; expressions, other functions and extra statements are rejected. Only an
explicit official hpdc27.hotcrp.com HTTPS link is recognized; new submission
platforms require deliberate adapter maintenance. Frontend uses textContent,
fixed source URLs, and a strict submission URL allowlist, never remote HTML.

## Verify

```
python -m unittest discover -s tests -v
node --check js/conference-updates.js
python scripts/refresh_hpdc.py
python -m http.server 8080
```

Six tests cover source fixtures, malformed/year/timezone/mismatched dates,
untrusted submission links, stable change timestamp, timeout preserving last
valid data, and fail-closed without a snapshot. Fixtures are minimal date spans,
not full copies of the conference website. Responsive CSS changes date columns
to rows under 560px. Browser preview was attempted but the cloud browser could
not reach the local HTTP server (connection refused); visual browser QA remains
for integration. No actual hosted Actions run was performed in this checkout.
