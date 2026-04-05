# Changelog

## v0.5.0
- add self-healing execution with AI-generated recovery commands
- add execution snapshots, rollback support, and partial execution summaries
- add execution, plan, and error logs under `.gitguide/logs/`
- add `gitguide pr`, `gitguide undo`, `gitguide resolve-conflicts`, and `gitguide evaluate-models`

## v0.4.0
- add undo support powered by execution snapshots
- add a basic merge conflict resolver workflow
- improve explainability by always rendering the execution plan with risk labels

## v0.3.0
- move configuration into `.gitguide/config.json`
- add `gitguide config` for auto execute, default branch, preferred model, and safety level
- add strict plan validation, repair flow, and risk scoring
- expand GitHub MCP support with richer remote status and pull request creation
