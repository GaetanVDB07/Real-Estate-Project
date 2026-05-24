# Real Estate Project

Upcoming real estate project.

## Development

This project uses a **prod / dev** branching model:

- **`dev`** — integration branch; feature and fix branches merge here
- **`prod`** — production branch; hotfixes and releases land here
- **`feature/*`**, **`fix/*`** — branch from `dev`, merge back to `dev`
- **`hotfix/*`** — branch from `prod`, merge to `prod`, then back-merge to `dev`

See **[docs/git-workflow.md](docs/git-workflow.md)** for diagrams and step-by-step commands.

## Versioning

Current version: **0.0.0** (see [`VERSION`](VERSION))

Releases are automated with [Semantic Versioning](https://semver.org/):

- Merging `feature/*` or `fix/*` into **`dev`** bumps the patch version (`0.0.1`, `0.0.2`, …)
- Merging **`dev`** into **`prod`** tags a release (`v0.0.N`) without a new bump
- Merging `hotfix/*` into **`prod`** bumps the patch and tags a release
- Back-merging a hotfix into **`dev`** syncs the version from `prod` (no double-bump)

See [GitHub Releases](https://github.com/GaetanVDB07/Real-Estate-Project/releases) and [CHANGELOG.md](CHANGELOG.md).

## License

**All Rights Reserved.** This repository is public for reference only.

You may view the source on GitHub for personal, non-commercial reference.
You may **not** use, copy, modify, distribute, commercialize, deploy, or
create derivative works from this project without prior written permission
from the copyright holder.

See [LICENSE](LICENSE) for full terms.

<!-- test: feature version bump -->
<!-- test: fix version bump -->
