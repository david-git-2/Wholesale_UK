# Architecture Replication Playbook (V2)

Use this document to convert another project into the same architecture used here.

## 1) Target Architecture (Quick Rule)

```txt
UI (pages/components)
  -> services (business use-cases)
    -> domain (types/schema/calc/policy)
      -> infra repos (Firestore read/write)
```

Hard rule:
- No Firestore calls directly from pages/components.
- All writes go through `services/*`.
- `domain/*` must be pure (no network/React).

## 2) Folder Blueprint

```txt
web/src
├── app/                  # app shell, providers, routes, query client
├── components/           # shared/ui components
├── domain/               # per-domain schema/types/validators/calc/policy
├── features/             # feature UI modules (components/hooks/pages)
├── infra/firebase/       # firebase client + repos
├── lib/                  # ids, money, dates, format, queryKeys
├── services/             # use-case orchestration layer
└── store/                # global app store (small UI state only)
```

## 3) Domain Contract (Per Collection)

For each domain, create:
- `schema.json` (storage contract for migration/reference)
- `types.js` (runtime JSDoc types)
- `validators.js` (shape + required fields)
- `calc.js` (if domain has formulas)

Example:

```txt
domain/users/
├── schema.json
├── types.js
└── validators.js
```

## 4) Repo + Service Pattern

For each domain:

1. Repo (`infra/firebase/repos/*Repo.js`)
- Firestore queries only.
- No pricing/status/business decisions.

2. Service (`services/*/*Service.js`)
- Calls repo(s).
- Applies status policy, calculations, validation.
- Returns UI-ready data.

3. Feature hook (`features/*/hooks/use*.js`)
- Uses TanStack Query.
- Talks only to service functions.

## 5) TanStack Query Standard

Use these defaults:
- long `staleTime` for stable data (users, config, master lists)
- short `staleTime` for fast-changing details (orders/shipments detail)
- mutation success: invalidate targeted keys only
- avoid global “invalidate all”

Rule:
- Server state in Query cache.
- Keep Zustand/global store only for local UI state (sidebar open, draft toggles).

## 6) Status/Permission Policy

Keep one central policy module:

```txt
domain/status/policy.js
```

Must export capabilities like:
- `canEditOrder`
- `canChangeOrderStatus`
- `canEditShipment`
- `canChangeShipmentStatus`

Use this same policy in:
- UI visibility/disabled states
- Service write guards

Firestore rules remain final enforcement.

## 7) Naming Standards

- Collection names: plural snake_case (`order_items`, `shipment_items`)
- IDs: string IDs with stable prefix (`ORD_*`, `SHP_*`, etc.)
- Timestamps: `created_at`, `updated_at` (server timestamp)
- Booleans in Firestore: prefer `1/0` if project already standardized there

## 8) Incremental Migration Plan (For Another Project)

1. Create structure first (`domain`, `services`, `infra/repos`, `features`).
2. Move one vertical slice at a time:
   - users -> cart -> shipments -> orders -> accounting
3. For each slice:
   - add `schema.json`
   - add `types.js` + validators
   - implement repo
   - implement service
   - switch UI hook/page to service
   - remove old direct Firestore calls
4. Add/adjust Firestore rules after each slice.
5. Add test cases doc for that slice.

## 9) Definition of Done (Per Slice)

- No Firestore import in page/component files.
- All business logic in service/domain only.
- Query keys centralized and invalidation targeted.
- Schema JSON + types + validator exist.
- Status policy checks applied on writes.
- Firestore rule coverage confirmed.

## 10) Copy Checklist

Use this checklist when porting:

- [ ] Create `web/src/domain/<module>/schema.json`
- [ ] Create `web/src/domain/<module>/types.js`
- [ ] Create `web/src/domain/<module>/validators.js`
- [ ] Create `web/src/infra/firebase/repos/<module>Repo.js`
- [ ] Create `web/src/services/<module>/<module>Service.js`
- [ ] Create `web/src/features/<module>/hooks/use<Module>.js`
- [ ] Replace page direct DB calls with service/hook calls
- [ ] Add query keys in `web/src/lib/queryKeys.js`
- [ ] Add/verify status policy use (UI + service)
- [ ] Verify Firestore rules for read/write scope

## 11) Recommended Order For New Project

1. `users` (auth profile + permissions)
2. `cart` (independent)
3. `shipments core`
4. `product weights`
5. `orders + order_items`
6. `calculation engine`
7. `shipment accounting`
8. `investors + investor_transactions`

This keeps independent modules first, then dependent modules.
