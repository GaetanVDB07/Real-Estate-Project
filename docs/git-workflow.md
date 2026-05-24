# Git Workflow

This repository uses a **prod / dev** branching model. All day-to-day work happens on `dev`. `prod` holds production-ready code only.

## Branch overview

| Branch | Purpose | Who merges here |
|--------|---------|-----------------|
| `prod` | Production-ready, deployable code | Hotfixes only (via PR) |
| `dev` | Integration branch for ongoing development | Features, fixes, and hotfix back-merges |
| `feature/*` | New functionality | → `dev` |
| `fix/*` | Bug fixes (non-urgent) | → `dev` |
| `hotfix/*` | Urgent production fixes | → `prod`, then back to `dev` |

## Workflow diagram

```mermaid
flowchart TB
    subgraph long["Long-lived branches"]
        PROD["prod<br/>(production)"]
        DEV["dev<br/>(development)"]
    end

    subgraph short["Short-lived branches"]
        FEAT["feature/*"]
        FIX["fix/*"]
        HOT["hotfix/*"]
    end

    DEV -->|"release / promote"| PROD
    PROD -.->|"sync after release"| DEV

    FEAT -->|"PR merge"| DEV
    FIX -->|"PR merge"| DEV
    HOT -->|"PR merge"| PROD
    HOT -->|"back-merge PR"| DEV

    DEV -.->|"branch from"| FEAT
    DEV -.->|"branch from"| FIX
    PROD -.->|"branch from"| HOT
```

## Branch lifecycle

```mermaid
gitGraph
    commit id: "initial"
    branch dev
    checkout dev
    commit id: "dev work"
    branch feature/user-auth
    checkout feature/user-auth
    commit id: "auth WIP"
    commit id: "auth done"
    checkout dev
    merge feature/user-auth id: "merge feature"
    branch fix/login-error
    checkout fix/login-error
    commit id: "fix login"
    checkout dev
    merge fix/login-error id: "merge fix"
    checkout main
    merge dev id: "release to prod" type: HIGHLIGHT
    branch hotfix/critical-bug
    checkout hotfix/critical-bug
    commit id: "urgent patch"
    checkout main
    merge hotfix/critical-bug id: "hotfix to prod" type: REVERSE
    checkout dev
    merge hotfix/critical-bug id: "back-merge hotfix"
```

> **Note:** In the git graph above, `main` represents `prod` (Mermaid's `gitGraph` uses `main` as the default first branch name).

## Rules

### Feature branches → `dev`

Use for new functionality, refactors, and non-urgent improvements.

```bash
git checkout dev
git pull origin dev
git checkout -b feature/short-description
# ... work, commit ...
git push -u origin feature/short-description
# Open PR: base = dev, compare = feature/short-description
```

**Naming:** `feature/add-property-search`, `feature/dashboard-ui`

### Fix branches → `dev`

Use for bugs found during development or in non-production environments.

```bash
git checkout dev
git pull origin dev
git checkout -b fix/broken-filter
# ... work, commit ...
git push -u origin fix/broken-filter
# Open PR: base = dev, compare = fix/broken-filter
```

**Naming:** `fix/map-marker-crash`, `fix/validation-message`

### Hotfix branches → `prod` (then back to `dev`)

Use only for **urgent production issues** that cannot wait for the next release from `dev`.

```bash
git checkout prod
git pull origin prod
git checkout -b hotfix/payment-timeout
# ... work, commit ...
git push -u origin hotfix/payment-timeout
# Open PR #1: base = prod, compare = hotfix/payment-timeout
# After merge to prod, open PR #2: base = dev, compare = hotfix/payment-timeout (or prod)
```

**Naming:** `hotfix/security-patch`, `hotfix/checkout-error`

Always back-merge the hotfix into `dev` so the fix is not lost in the next release.

### Releasing `dev` → `prod`

When `dev` is stable and ready for production:

```bash
git checkout prod
git pull origin prod
git merge dev
git push origin prod
```

Prefer a **pull request** from `dev` into `prod` for review and a clear audit trail.

## Pull request checklist

| Branch type | Base branch | Merge target |
|-------------|-------------|--------------|
| `feature/*` | `dev` | `dev` |
| `fix/*` | `dev` | `dev` |
| `hotfix/*` | `prod` | `prod`, then `dev` |
| Release | `prod` | merge `dev` → `prod` |

## Quick reference

```
prod  ─────────────────────────────────────────────►  (production)
  ▲                           ▲
  │ hotfix/*                  │ release (dev → prod)
  │                           │
  └── hotfix/* ──► back-merge to dev

dev   ─────────────────────────────────────────────►  (integration)
  ▲           ▲
  │           │
  feature/*   fix/*
```

## Fork policy

Forking is **disabled where GitHub allows it** (organization-owned private repositories). This is a **public personal repository**, so GitHub does not offer a fork ban setting for this repo type. Use is further restricted by the [LICENSE](../LICENSE) (all rights reserved, no commercial use).

## Versioning

This project uses **Semantic Versioning (SemVer)** with a single shared version counter in [`VERSION`](../VERSION). Bumps are automated by [`.github/workflows/version-bump.yml`](../.github/workflows/version-bump.yml) when pull requests merge.

### Version rules

| Event | Version bump? | Git tag? | Notes |
|-------|---------------|----------|-------|
| `feature/*` → `dev` | Yes — patch | No | Dev moves ahead; prod unchanged |
| `fix/*` → `dev` | Yes — patch | No | Same as features during `0.0.x` |
| `dev` → `prod` (release) | No | Yes — `vX.Y.Z` | Prod catches up to dev's version |
| `hotfix/*` → `prod` | Yes — patch | Yes — `vX.Y.Z` | Urgent production fix |
| `hotfix/*` → `dev` (back-merge) | No — sync from prod | No | Avoids double-bump |

While the project is at `0.0.x`, every bump is a **patch** increment (`0.0.1` → `0.0.2`). After `1.0.0`, teams typically use minor bumps for features and patch bumps for fixes/hotfixes.

### Version flow

```mermaid
flowchart LR
    subgraph devTrack [dev branch]
        FEAT["feature/* merge"] -->|"bump patch"| DEV["dev @ 0.0.8"]
        FIX["fix/* merge"] -->|"bump patch"| DEV
    end

    subgraph prodTrack [prod branch]
        RELEASE["release: dev to prod"] -->|"tag v0.0.8"| PROD["prod @ 0.0.8"]
        HOT["hotfix/* merge"] -->|"bump + tag"| PROD2["prod @ 0.0.9"]
    end

    DEV -->|"promote when ready"| RELEASE
    HOT -->|"back-merge sync"| DEV
```

### Example timeline

| Action | `dev` VERSION | `prod` VERSION | Git tag |
|--------|---------------|----------------|---------|
| Start | 0.0.0 | 0.0.0 | — |
| Merge `feature/auth` → dev | **0.0.1** | 0.0.0 | — |
| Merge `fix/typo` → dev | **0.0.2** | 0.0.0 | — |
| Release dev → prod | 0.0.2 | 0.0.2 | **v0.0.2** |
| Merge `hotfix/payment` → prod | 0.0.2 | **0.0.3** | **v0.0.3** |
| Back-merge hotfix → dev | **0.0.3** | 0.0.3 | — |

### What gets updated automatically

- [`VERSION`](../VERSION) — single source of truth
- [`CHANGELOG.md`](../CHANGELOG.md) — entry added on each bump
- **Git tags** — created on prod for releases and hotfixes (`v0.0.N`)
- **GitHub Releases** — created from tags

Bot commits use `[skip ci]` to avoid re-triggering workflows.

### Manual versioning

Do **not** edit `VERSION` in feature, fix, or hotfix branches. The automation handles it on merge. See [docs/versioning-test-plan.md](versioning-test-plan.md) for how to verify the workflow.
