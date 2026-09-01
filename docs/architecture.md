# Architecture

## Runtime flow

```text
pages/* interaction
        │
        ├── utils/tools.js          tool registry and discovery
        ├── utils/storage.js        bounded local persistence
        ├── utils/analytics.js      whitelisted non-sensitive events
        └── utils/*                 pure calculations and media helpers
                 │
                 └── Node.js regression tests
```

The public build has no custom server, cloud function, account login, API credential, or formal WeChat AppID. WeChat-native capabilities such as media selection, on-device OCR, local storage, feedback, and optional platform analytics are called through `wx.*` only when the related page needs them.

## Design rules

- UI state and WeChat lifecycle logic stay in `pages/`.
- Reusable calculations and transformations stay in `utils/`.
- `utils/tools.js` is the single tool registry used by the drawer, search, favorites, and recent history.
- Sensitive tools are blocked at the analytics reporting boundary, not only at individual call sites.
- Each registered page must ship `.js`, `.json`, `.wxml`, and `.wxss` files.
- Public release checks reject cloud directories, account-bound configuration, direct network calls, and common credential patterns.

## Validation boundary

Node.js tests can validate deterministic algorithms, repository structure, static page contracts, and public-safety rules. They cannot prove behavior of a specific WeChat version, phone, camera, OCR runtime, permission prompt, or photo album implementation.
