---
name: logs
emoji: 📋
description: Views and filters application logs from local or remote environments. Use when debugging issues or monitoring application behavior.
---

# Logs

View and analyze application logs.

## Contents

- [View Local Development Logs](#view-local-development-logs)
- [Filter Logs by Level](#filter-logs-by-level)
- [Search Logs for Patterns](#search-logs-for-patterns)
- [View Remote Environment Logs](#view-remote-environment-logs)
- [Export Logs for Analysis](#export-logs-for-analysis)

---

## View Local Development Logs

Access local logs:

```bash
# Tail dev server logs
pnpm dev 2>&1 | tee logs/dev.log

# View recent logs
tail -f logs/app.log

# Docker container logs
docker-compose logs -f app
```

Why: Local logs help debug development issues.

---

## Filter Logs by Level

Filter by severity:

```bash
# Errors only
grep -E "ERROR|error|Error" logs/app.log

# Warnings and errors
grep -E "WARN|ERROR|warn|error" logs/app.log

# Structured logs (JSON)
cat logs/app.log | jq 'select(.level == "error")'
```

Log levels:
| Level | Use |
|-------|-----|
| ERROR | Failures requiring attention |
| WARN | Potential issues |
| INFO | Normal operations |
| DEBUG | Detailed debugging |

Why: Filtering reduces noise when debugging.

---

## Search Logs for Patterns

Find specific entries:

```bash
# Search for user ID
grep "user_123" logs/app.log

# Search for request ID
grep "req-abc-123" logs/app.log

# Search time range
awk '/2024-01-15T10:00/,/2024-01-15T11:00/' logs/app.log

# JSON logs - search by field
cat logs/app.log | jq 'select(.userId == "user_123")'
```

Why: Pattern search locates specific events.

---

## View Remote Environment Logs

Access deployed logs:

```bash
# Vercel
vercel logs --follow

# AWS CloudWatch
aws logs tail /aws/lambda/my-function --follow

# Heroku
heroku logs --tail --app my-app

# Kubernetes
kubectl logs -f deployment/my-app -n production

# Datadog (via CLI)
dog logs tail "service:my-app env:production"
```

Why: Remote logs diagnose production issues.

---

## Export Logs for Analysis

Save logs for review:

```bash
# Export time range
grep "2024-01-15" logs/app.log > logs/export-2024-01-15.log

# Export errors
grep "ERROR" logs/app.log > logs/errors.log

# Export as JSON
cat logs/app.log | jq -s '.' > logs/export.json

# Compress for sharing
tar -czf logs-2024-01-15.tar.gz logs/export-*.log
```

Report template:

```markdown
## Log Analysis

**Time range:** 2024-01-15 10:00 - 11:00
**Environment:** production
**Total entries:** 1,234
**Errors:** 12
**Warnings:** 45

### Top Errors
1. `DatabaseConnectionError` - 5 occurrences
2. `TimeoutError` - 4 occurrences
3. `ValidationError` - 3 occurrences
```

Why: Exported logs enable offline analysis.
