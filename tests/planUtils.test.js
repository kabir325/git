import test from 'node:test';
import assert from 'node:assert/strict';
import { assessCommandRisk, validateExecutionPlan } from '../src/planUtils.js';

test('validateExecutionPlan accepts a valid git plan', () => {
  const result = validateExecutionPlan({
    plan: [
      {
        step: 1,
        command: 'git status',
        description: 'Inspect repository status'
      }
    ]
  });

  assert.equal(result.valid, true);
  assert.equal(result.plan.length, 1);
  assert.equal(result.plan[0].step, 1);
});

test('validateExecutionPlan rejects non-git commands', () => {
  const result = validateExecutionPlan({
    plan: [
      {
        step: 1,
        command: 'echo hello',
        description: 'Not a git command'
      }
    ]
  });

  assert.equal(result.valid, false);
  assert.match(result.errors[0], /must start with a git command/i);
});

test('assessCommandRisk marks force push as high risk', () => {
  const risk = assessCommandRisk('git push --force origin main');

  assert.equal(risk.level, 'high');
});

test('assessCommandRisk marks merge as medium risk', () => {
  const risk = assessCommandRisk('git merge feature/auth');

  assert.equal(risk.level, 'medium');
});
