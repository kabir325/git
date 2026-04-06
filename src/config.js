import path from 'path';
import dotenv from 'dotenv';
import { readProjectConfig } from './configStore.js';
import { getDefaultBranchGuess } from './gitUtils.js';

// Load .env if it exists in the root
dotenv.config({ path: path.join(process.cwd(), '.env') });

export function getConfig() {
  const userConfig = readProjectConfig(process.cwd());
  const mcpConfig = userConfig.mcp || {};
  
  return {
    defaultBranch: userConfig.defaultBranch || getDefaultBranchGuess(),
    preferredModel: userConfig.preferredModel || 'deepseek-coder',
    safetyLevel: userConfig.safetyLevel || 'balanced',
    execution: {
      autoExecute: userConfig.execution?.autoExecute ?? false,
      explainPlan: userConfig.execution?.explainPlan ?? true
    },
    mcp: {
      github: {
        enabled: mcpConfig.github?.enabled ?? false,
        // Allow fallback to environment variables
        token: mcpConfig.github?.token || process.env.GITHUB_PERSONAL_ACCESS_TOKEN || null
      },
      jira: {
        enabled: mcpConfig.jira?.enabled ?? false,
        token: mcpConfig.jira?.token || process.env.JIRA_API_TOKEN || null,
        url: mcpConfig.jira?.url || process.env.JIRA_URL || null,
        email: mcpConfig.jira?.email || process.env.JIRA_EMAIL || null
      }
    }
  };
}
