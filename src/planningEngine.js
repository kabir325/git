import { getConfig } from './config.js';
import { extractJsonObject, validateExecutionPlan } from './planUtils.js';
import { writeErrorLog } from './logger.js';

function resolveModel(model) {
  return model || getConfig().preferredModel || 'deepseek-coder';
}

export async function callOllama(prompt, model = null, format = null, onChunk = null) {
  const selectedModel = resolveModel(model);
  const body = {
    model: selectedModel,
    prompt,
    stream: !!onChunk,
    options: {
      temperature: 0.1
    }
  };

  if (format) {
    body.format = format;
  }

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  if (!onChunk) {
    const data = await response.json();
    return data.response;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      const data = JSON.parse(line);
      fullText += data.response;
      onChunk(data.response);
    }
  }

  if (buffer.trim()) {
    const data = JSON.parse(buffer);
    fullText += data.response;
    onChunk(data.response);
  }

  return fullText;
}

function buildPlanPrompt(instruction, repoContext) {
  return `
You are an expert Git planning engine. Your ONLY job is to generate a step-by-step execution plan based on the user's instruction and the current repository context.

Current Repository Context:
- Current Branch: ${repoContext.currentBranch || 'None'}
- Git Status:
${repoContext.status || '(clean)'}
- Diff Summary:
${repoContext.diffSummary || 'None'}
- Recent Commits:
${repoContext.recentCommits || 'None'}
- Ahead/Behind Origin:
${repoContext.aheadBehind || 'unknown'}

User Instruction: "${instruction}"

CRITICAL INSTRUCTIONS:
1. You MUST output ONLY a strictly valid JSON object.
2. DO NOT output any conversational text, markdown formatting, or explanations whatsoever. Just the JSON.
3. Every step must be an executable Git command that starts with "git".
4. Make sure each step has a valid string for "command" and "description".
5. NEVER use placeholders like <repo_name> when the user provided a concrete value.
6. The JSON must exactly match this structure:

{
  "plan": [
    {
      "step": 1,
      "command": "git status",
      "description": "Inspect repository status"
    }
  ]
}
`;
}

async function requestPlan(prompt, model) {
  const responseText = await callOllama(prompt, model, 'json');
  const payload = JSON.parse(extractJsonObject(responseText));
  return validateExecutionPlan(payload);
}

async function repairPlan(instruction, repoContext, rawOutput, validationErrors, model) {
  const prompt = `
You must repair a malformed Git execution plan.

User Instruction: "${instruction}"

Repository Context:
- Current Branch: ${repoContext.currentBranch || 'None'}
- Git Status:
${repoContext.status || '(clean)'}

Validation Errors:
${validationErrors.join('\n')}

Malformed Output:
${rawOutput}

Return ONLY valid JSON with this shape:
{
  "plan": [
    {
      "step": 1,
      "command": "git status",
      "description": "Inspect repository status"
    }
  ]
}
`;

  const responseText = await callOllama(prompt, model, 'json');
  const payload = JSON.parse(extractJsonObject(responseText));
  return validateExecutionPlan(payload);
}

export async function generatePlan(instruction, repoContext) {
  try {
    const selectedModel = resolveModel();
    const planResult = await requestPlan(buildPlanPrompt(instruction, repoContext), selectedModel);

    if (planResult.valid) {
      return { plan: planResult.plan };
    }

    const repairedResult = await repairPlan(
      instruction,
      repoContext,
      JSON.stringify({ plan: planResult.plan }, null, 2),
      planResult.errors,
      selectedModel
    );

    if (repairedResult.valid) {
      return { plan: repairedResult.plan };
    }

    throw new Error(repairedResult.errors.join(' '));
  } catch (error) {
    writeErrorLog({
      type: 'plan-generation',
      instruction,
      error: error.message,
      repoContext
    });
    throw new Error(`Failed to generate a valid execution plan. ${error.message}`);
  }
}

export async function explainCommandIntent(command, repoContext, onChunk) {
  const prompt = `
You are a helpful Git instructor. The user wants to run the following Git command:
"${command}"

Here is the current state of their repository:
- Current Branch: ${repoContext.currentBranch}
- Uncommitted Changes (git status):
${repoContext.status || '(clean)'}

Briefly explain:
1. What the command generally does.
2. What it will do specifically in this repository based on the current context.

Keep it concise, clear, and professional.
`;

  return await callOllama(prompt, null, null, onChunk);
}

export async function generateCommitMessage(diff, onChunk) {
  const prompt = `
You are a senior developer writing conventional commit messages.
Review the following Git diff and generate a concise, conventional commit message (feat, fix, refactor, chore, docs, etc.).

Diff:
${diff.slice(0, 3000)} // Truncated for token limits

Respond ONLY with the commit message. No explanations, no quotes.
`;
  
  let msg = await callOllama(prompt, null, null, onChunk);
  return msg.trim().replace(/^"/, '').replace(/"$/, '');
}

export async function suggestNextActions(repoContext, onChunk) {
  const prompt = `
You are a Git advisor. Based on the current repository state, suggest 2-3 logical next actions.

- Current Branch: ${repoContext.currentBranch}
- Git Status:
${repoContext.status || '(clean)'}
- Ahead/Behind Origin: ${repoContext.aheadBehind}

Keep it brief and actionable. Return a list.
`;
  return await callOllama(prompt, null, null, onChunk);
}

export async function generateRecoveryPlan(step, errorMessage, repoContext, executedSteps = []) {
  const prompt = `
You are a Git recovery engine. A step in an automated Git workflow failed.

Failed Step:
- Description: ${step.description}
- Command: ${step.command}

Error:
${errorMessage.slice(0, 1500)}

Executed Steps So Far:
${executedSteps.map(item => `- ${item.command}`).join('\n') || 'None'}

Repository Context:
- Current Branch: ${repoContext.currentBranch || 'None'}
- Git Status:
${repoContext.status || '(clean)'}

Return ONLY JSON in this shape:
{
  "summary": "Short explanation",
  "retryCommands": [
    {
      "command": "git fetch origin",
      "description": "Fetch the latest remote refs"
    }
  ],
  "retryOriginalStep": true
}

Rules:
- Keep retryCommands empty if no safe deterministic recovery exists.
- Only include Git commands.
- Prefer the smallest safe fix.
`;

  const responseText = await callOllama(prompt, null, 'json');
  const payload = JSON.parse(extractJsonObject(responseText));

  return {
    summary: typeof payload.summary === 'string' ? payload.summary.trim() : 'No recovery summary provided.',
    retryCommands: Array.isArray(payload.retryCommands)
      ? payload.retryCommands
        .filter(item => typeof item?.command === 'string' && typeof item?.description === 'string')
        .map((item, index) => ({
          step: index + 1,
          command: item.command.trim(),
          description: item.description.trim()
        }))
      : [],
    retryOriginalStep: payload.retryOriginalStep !== false
  };
}

export async function evaluateModelCandidates(models, repoContext) {
  const prompt = buildPlanPrompt('create a new branch called feature/demo and show status', repoContext);
  const results = [];

  for (const model of models) {
    const startedAt = Date.now();

    try {
      const responseText = await callOllama(prompt, model, 'json');
      const parsed = JSON.parse(extractJsonObject(responseText));
      const validation = validateExecutionPlan(parsed);

      results.push({
        model,
        durationMs: Date.now() - startedAt,
        valid: validation.valid,
        error: validation.valid ? null : validation.errors.join(' '),
        stepCount: validation.plan.length
      });
    } catch (error) {
      results.push({
        model,
        durationMs: Date.now() - startedAt,
        valid: false,
        error: error.message,
        stepCount: 0
      });
    }
  }

  return results.sort((a, b) => {
    if (a.valid !== b.valid) {
      return Number(b.valid) - Number(a.valid);
    }

    return a.durationMs - b.durationMs;
  });
}
