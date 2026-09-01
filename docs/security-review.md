# Security review

Checked for the public 1.4.0 repository on 2026-09-01.

## Confirmed controls

- No cloud function, cloud environment ID, formal AppID, API key, private key, or account token is required.
- Table-cleaner output neutralizes leading spreadsheet formula markers before export or copy workflows.
- Photo background removal operates locally and stops when background confidence is too low.
- Async photo and OCR callbacks are invalidated when the page unloads.
- Sensitive tools are denied at the central analytics boundary.
- Local record collections use normalization and bounded retention.
- GitHub Actions runs the regression suite and public release preflight on pushes and pull requests.

## Remaining limits

- Static tests cannot model every WeChat client or device permission behavior.
- Local storage is not encrypted storage and should not hold passwords or identity documents.
- Ingredient comparison and benefit calculations are informational, not medical, legal, or financial advice.
