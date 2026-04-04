import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env if it exists in the root
dotenv.config({ path: path.join(process.cwd(), '.env') });

export function getConfig() {
  const configPath = path.join(process.cwd(), '.gitguide.config.json');
  let userConfig = {};

  if (fs.existsSync(configPath)) {
    try {
      userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.warn('⚠️  Warning: Failed to parse .gitguide.config.json');
    }
  }

  // MCP configuration defaults
  const mcpConfig = userConfig.mcp || {};
  
  return {
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
