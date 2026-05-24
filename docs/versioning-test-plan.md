# Versioning Test Plan

Manual verification checklist for [`.github/workflows/version-bump.yml`](../.github/workflows/version-bump.yml).

## Prerequisites

- Workflow is merged into `dev` and `prod`
- [`VERSION`](../VERSION) is `0.0.0` on both branches before testing
- Pull requests are merged via GitHub (not local merges) so the workflow triggers

## Scenarios

### 1. Feature merge → dev (patch bump)

1. Branch `feature/test-version` from `dev`
2. Make a trivial change (e.g. add a comment to README)
3. Open PR: base `dev`, compare `feature/test-version`
4. Merge the PR

**Expected:**

- [`VERSION`](../VERSION) on `dev` becomes `0.0.1`
- [`CHANGELOG.md`](../CHANGELOG.md) gains a `0.0.1` section
- Bot commit: `chore(release): bump version to 0.0.1 [skip ci]`
- `prod` stays at `0.0.0`
- No new git tag

### 2. Fix merge → dev (patch bump)

1. Branch `fix/test-version` from `dev`
2. Make a trivial change
3. Open PR: base `dev`, compare `fix/test-version`
4. Merge the PR

**Expected:**

- `dev` VERSION becomes `0.0.2`
- New changelog entry for `0.0.2`
- No git tag

### 3. Release dev → prod (tag only)

1. Open PR: base `prod`, compare `dev`
2. Merge the PR

**Expected:**

- `prod` VERSION matches `dev` (`0.0.2`) — no extra bump
- Git tag `v0.0.2` created
- GitHub Release `v0.0.2` published

### 4. Hotfix → prod (patch bump + tag)

1. Branch `hotfix/test-version` from `prod`
2. Make a trivial change
3. Open PR: base `prod`, compare `hotfix/test-version`
4. Merge the PR

**Expected:**

- `prod` VERSION becomes `0.0.3`
- Git tag `v0.0.3` created
- GitHub Release `v0.0.3` published

### 5. Hotfix back-merge → dev (sync, no bump)

1. Open PR: base `dev`, compare `hotfix/test-version` (or the hotfix branch)
2. Merge the PR

**Expected:**

- `dev` VERSION syncs to `0.0.3` (matches prod)
- Bot commit: `chore(release): sync version to 0.0.3 from prod [skip ci]`
- No new git tag
- No patch increment beyond prod's version

## Skipped scenarios (no action)

| Merge | Expected |
|-------|----------|
| Wrong branch name → `dev` (e.g. `chore/foo`) | Workflow skips — VERSION unchanged |
| Direct push to `dev` / `prod` (no PR) | Workflow does not run |
| Bot commit with `[skip ci]` pushed directly | Workflow does not run (no PR merge) |

## Validation commands

After each scenario, verify locally:

```bash
git fetch origin
git show origin/dev:VERSION
git show origin/prod:VERSION
git tag -l 'v*'
gh release list
```

## Workflow run inspection

In GitHub Actions, open the **Version Bump** run for the merged PR and confirm:

1. **Determine version action** step logs the correct `action` and `tag` values
2. Only the expected steps run (`bump`, `sync_from_prod`, or `Create release tag`)
3. No workflow failures on git push or release creation

## Rollback (test environments only)

If a test bump needs reverting:

```bash
git revert <bot-commit-sha>
git push origin dev   # or prod
git tag -d v0.0.X
git push origin :refs/tags/v0.0.X
gh release delete v0.0.X -y
```

Do not delete tags on real production releases without team agreement.
