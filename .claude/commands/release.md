---
name: release
emoji: 🏷️
description: Creates a new release with version bump, changelog, and git tag. Use when preparing a new version for deployment.
---

# Release

Create versioned release with changelog.

## Contents

- [Determine Version Bump Type](#determine-version-bump-type)
- [Update Version in Package Files](#update-version-in-package-files)
- [Generate Changelog from Commits](#generate-changelog-from-commits)
- [Create Git Tag](#create-git-tag)
- [Push Release to Remote](#push-release-to-remote)

---

## Determine Version Bump Type

Follow semantic versioning:

| Change Type | Version Bump | Example |
|-------------|--------------|---------|
| Breaking change | Major | 1.0.0 → 2.0.0 |
| New feature | Minor | 1.0.0 → 1.1.0 |
| Bug fix | Patch | 1.0.0 → 1.0.1 |

Ask user:
```
Current version: 1.2.3
What type of release? [major | minor | patch]
```

Why: Semantic versioning communicates change impact.

---

## Update Version in Package Files

Bump version:

```bash
# Using npm version
npm version patch  # or minor, major

# Or manually update
# - package.json
# - package-lock.json (auto-updated)
```

Why: Version must be updated before changelog generation.

---

## Generate Changelog from Commits

Build changelog from conventional commits:

```bash
# Auto-generate
pnpm changelog

# Or manually compile
git log v1.2.3..HEAD --oneline
```

Format:

```markdown
## [1.2.4] - 2024-01-15

### Added
- New feature X (#123)

### Fixed
- Bug in Y (#124)

### Changed
- Updated Z behavior (#125)
```

Why: Changelog documents changes for users and developers.

---

## Create Git Tag

Tag the release:

```bash
# Create annotated tag
git tag -a v1.2.4 -m "Release v1.2.4"

# Verify tag
git show v1.2.4
```

Why: Tags mark specific release points in history.

---

## Push Release to Remote

Push changes and tag:

```bash
# Push commits
git push origin main

# Push tag
git push origin v1.2.4

# Or push all tags
git push origin --tags
```

Report:

```markdown
## Release v1.2.4 Complete

- Version: 1.2.4
- Tag: v1.2.4
- Changelog: Updated
- Pushed: ✅
```

Why: Remote push triggers CI/CD and makes release available.
