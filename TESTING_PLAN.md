# GitGuide Testing Plan

## 1. Installation
- run `npm install`
- run `npm link`
- confirm `gitguide --help` works
- confirm new commands appear: `config`, `pr`, `undo`, `resolve-conflicts`, `evaluate-models`

## 2. Initialization and Config
- run `gitguide init` in a fresh repository
- verify `.gitguide/config.json` is created
- verify `.env` is created only when GitHub MCP is enabled
- verify `gitguide config` shows:
  - remote origin
  - auto execute
  - default branch
  - preferred model
  - safety level
  - GitHub MCP
  - GitHub token state
- toggle each config option and confirm persistence

## 3. Natural Language Planning
- run `gitguide do "show repository status"`
- verify plan is printed before execution
- verify low-risk plans execute without a confirmation prompt when safety rules allow it
- run a medium-risk instruction like `gitguide do "rebase this branch on main"` and verify strict safety prompts when configured
- run a high-risk instruction like `gitguide do "reset this branch hard to origin/main"` and verify a confirmation prompt always appears

## 4. Auto Execute
- keep `autoExecute` disabled and verify risky plans still prompt
- enable `autoExecute` in `gitguide config`
- run a low-risk instruction and verify it executes without approval
- run a high-risk instruction and verify GitGuide still pauses for confirmation

## 5. Planning Validation
- test with ambiguous prompts and verify the plan still comes back as valid JSON
- stop Ollama and verify GitGuide fails with a clear error message
- restart Ollama and verify planning recovers normally

## 6. Execution Engine
- run a successful multi-step workflow and verify:
  - all steps execute in order
  - the workflow completes cleanly
  - logs are written under `.gitguide/logs/`
- test a failing workflow and verify:
  - the failing step is identified
  - GitGuide prints the recovery summary
  - GitGuide attempts recovery when safe
  - rollback happens when execution started from a clean working tree
  - partial execution summary is printed

## 7. Undo
- run a simple GitGuide workflow that creates a branch or commit
- run `gitguide undo`
- verify the undo plan is shown
- confirm the repository returns to the snapshot state after execution

## 8. Conflict Resolver
- create a merge conflict manually
- run `gitguide resolve-conflicts`
- verify unmerged files are listed
- resolve files manually and test the “stage all resolved files” option

## 9. GitHub MCP
- enable GitHub MCP and verify `gitguide remote-status`
- confirm it shows:
  - repository metadata
  - current branch remote existence
  - issue counts
  - pull request counts
  - recent commits
- run `gitguide pr` on a pushed feature branch
- verify the pull request is created successfully
- run `gitguide push` on a feature branch and verify PR suggestion appears

## 10. Model Evaluation
- run `gitguide evaluate-models`
- compare at least two installed Ollama models
- verify the preferred model can be saved to config
- verify later commands use the saved model

## 11. Visualization
- run `gitguide visualize`
- verify the HTML file is generated under `.gitguide/`
- verify the browser opens and shows graph, branches, and commits

## 12. Logs and Recovery Data
- inspect `.gitguide/logs/plans/`
- inspect `.gitguide/logs/executions/`
- inspect `.gitguide/logs/errors/`
- verify logs contain timestamps, steps, outcomes, and rollback or recovery data

## 13. Regression Checks
- run `gitguide commit`
- run `gitguide push`
- run `gitguide explain "git rebase main"`
- run `gitguide suggest`
- ensure older commands still work after the v0.5.0 changes
