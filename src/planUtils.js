const HIGH_RISK_PATTERNS = [
  { regex: /\breset\s+--hard\b/i, reason: 'Hard reset rewrites the working tree and discards changes.' },
  { regex: /\bpush\b.*\s(--force|-f)\b/i, reason: 'Force push rewrites remote history.' },
  { regex: /\bclean\b.*\s-f\b/i, reason: 'Git clean removes untracked files.' },
  { regex: /\bbranch\b.*\s-D\b/i, reason: 'Forced branch deletion can remove important references.' },
  { regex: /\brm\s+-rf\b/i, reason: 'Recursive delete removes files irreversibly.' },
  { regex: /\bcheckout\b\s+--\b/i, reason: 'Checkout with -- can discard local changes.' }
];

const MEDIUM_RISK_PATTERNS = [
  { regex: /\bpush\b/i, reason: 'Push affects the remote repository state.' },
  { regex: /\bmerge\b/i, reason: 'Merge changes branch history.' },
  { regex: /\brebase\b/i, reason: 'Rebase rewrites commit history.' },
  { regex: /\bcherry-pick\b/i, reason: 'Cherry-pick modifies commit history.' },
  { regex: /\bstash\s+pop\b/i, reason: 'Stash pop reapplies changes and can create conflicts.' },
  { regex: /\bcommit\s+--amend\b/i, reason: 'Amending a commit rewrites commit history.' }
];

export function extractJsonObject(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : text.trim();
}

export function validateExecutionPlan(payload) {
  const errors = [];
  const rawPlan = payload?.plan;

  if (!Array.isArray(rawPlan) || rawPlan.length === 0) {
    return {
      valid: false,
      errors: ['Plan must be a non-empty array.'],
      plan: []
    };
  }

  const plan = rawPlan.map((step, index) => {
    const normalizedStep = {
      step: index + 1,
      command: typeof step?.command === 'string' ? step.command.trim() : '',
      description: typeof step?.description === 'string' ? step.description.trim() : ''
    };

    if (!normalizedStep.command) {
      errors.push(`Step ${index + 1} is missing a valid command.`);
    }

    if (!normalizedStep.description) {
      errors.push(`Step ${index + 1} is missing a valid description.`);
    }

    if (normalizedStep.command && !/^git\b/i.test(normalizedStep.command)) {
      errors.push(`Step ${index + 1} must start with a git command.`);
    }

    return normalizedStep;
  });

  return {
    valid: errors.length === 0,
    errors,
    plan
  };
}

export function assessCommandRisk(command) {
  const reasons = [];

  for (const pattern of HIGH_RISK_PATTERNS) {
    if (pattern.regex.test(command)) {
      reasons.push(pattern.reason);
    }
  }

  if (reasons.length > 0) {
    return {
      level: 'high',
      score: 3,
      reasons
    };
  }

  for (const pattern of MEDIUM_RISK_PATTERNS) {
    if (pattern.regex.test(command)) {
      reasons.push(pattern.reason);
    }
  }

  if (reasons.length > 0) {
    return {
      level: 'medium',
      score: 2,
      reasons
    };
  }

  return {
    level: 'low',
    score: 1,
    reasons: ['Command only affects local repository state in a low-risk way.']
  };
}

export function annotatePlanWithRisk(plan) {
  return plan.map(step => ({
    ...step,
    risk: assessCommandRisk(step.command)
  }));
}

export function getHighestRiskLevel(plan) {
  const order = ['low', 'medium', 'high'];
  return annotatePlanWithRisk(plan).reduce((current, step) => {
    return order.indexOf(step.risk.level) > order.indexOf(current) ? step.risk.level : current;
  }, 'low');
}

export function shouldConfirmRisk(level, safetyLevel) {
  if (level === 'high') {
    return true;
  }

  if (safetyLevel === 'strict' && level === 'medium') {
    return true;
  }

  return false;
}
