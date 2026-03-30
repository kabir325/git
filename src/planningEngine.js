export async function callOllama(prompt, model = 'deepseek-coder', format = null) {
  try {
    const body = {
      model,
      prompt,
      stream: false,
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
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Failed to communicate with Ollama:', error.message);
    process.exit(1);
  }
}

export async function generatePlan(instruction, repoContext) {
  const prompt = `
You are an expert Git planning engine. Your ONLY job is to generate a step-by-step execution plan based on the user's instruction and the current repository context.

Current Repository Context:
- Current Branch: ${repoContext.currentBranch || 'None'}
- Git Status:
${repoContext.status || '(clean)'}
- Recent Commits:
${repoContext.recentCommits || 'None'}

User Instruction: "${instruction}"

CRITICAL INSTRUCTIONS:
1. You MUST output ONLY a strictly valid JSON object.
2. DO NOT output any conversational text, markdown formatting, or explanations whatsoever. Just the JSON.
3. Only use safe, executable Git commands.
4. If the user wants to initialize and push to a new remote repo, your plan MUST follow exactly these steps with these commands:
   - \`git init\`
   - \`git add .\`
   - \`git commit -m "initial commit"\`
   - \`git branch -M main\`
   - \`git remote add origin <url>\` (extract URL from prompt)
   - \`git push -u origin main\`
5. NEVER use angle brackets like \`<repo_name>\` or placeholders if the user provided the actual value (like a URL). Extract the URL from their instruction and use it directly.
6. Make sure each step has a valid string for \`command\` and \`description\`. Do NOT use "undefined".
7. The JSON must exactly match this structure:

{
  "plan": [
    {
      "step": 1,
      "command": "git init",
      "description": "Initialize repository"
    },
    {
      "step": 2,
      "command": "git add .",
      "description": "Stage all files"
    }
  ]
}
`;

  let responseText = await callOllama(prompt, 'deepseek-coder', 'json');

  // Extract JSON object safely using regex in case the model adds conversational text
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    responseText = jsonMatch[0];
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Failed to parse AI response as JSON. Raw output was:');
    console.error(responseText);
    process.exit(1);
  }
}

export async function explainCommandIntent(command, repoContext) {
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

  return await callOllama(prompt, 'deepseek-coder');
}

export async function generateCommitMessage(diff) {
  const prompt = `
You are a senior developer writing conventional commit messages.
Review the following Git diff and generate a concise, conventional commit message (feat, fix, refactor, chore, docs, etc.).

Diff:
${diff.slice(0, 3000)} // Truncated for token limits

Respond ONLY with the commit message. No explanations, no quotes.
`;
  
  let msg = await callOllama(prompt);
  return msg.trim().replace(/^"/, '').replace(/"$/, '');
}

export async function suggestNextActions(repoContext) {
  const prompt = `
You are a Git advisor. Based on the current repository state, suggest 2-3 logical next actions.

- Current Branch: ${repoContext.currentBranch}
- Git Status:
${repoContext.status || '(clean)'}
- Ahead/Behind Origin: ${repoContext.aheadBehind}

Keep it brief and actionable. Return a list.
`;
  return await callOllama(prompt);
}
