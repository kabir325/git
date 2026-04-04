import ora from 'ora';
import chalk from 'chalk';
import { mcpManager } from '../mcpManager.js';
import { getConfig } from '../config.js';
import { execSync } from 'child_process';

/**
 * Extracts owner and repo name from git remote url.
 * E.g. https://github.com/kabir325/dummy.git -> { owner: "kabir325", repo: "dummy" }
 */
function getGitHubRepoInfo() {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url').toString().trim();
    const match = remoteUrl.match(/github\.com[:\/]([^\/]+)\/(.+?)(\.git)?$/);
    if (match && match.length >= 3) {
      return { owner: match[1], repo: match[2].replace('.git', '') };
    }
  } catch (e) {
    // Ignore error
  }
  return null;
}

export async function remoteStatusCommand() {
  const config = getConfig();

  if (!config.mcp.github.enabled) {
    console.log(chalk.yellow('⚠️  GitHub MCP is not enabled.'));
    console.log(chalk.dim('To opt-in, create a .gitguide.config.json file with:'));
    console.log(chalk.dim('{\n  "mcp": {\n    "github": { "enabled": true }\n  }\n}'));
    console.log(chalk.dim('And ensure GITHUB_PERSONAL_ACCESS_TOKEN is set in your environment.'));
    return;
  }

  const repoInfo = getGitHubRepoInfo();
  if (!repoInfo) {
    console.log(chalk.red('❌ Could not determine GitHub repository owner and name from remote "origin".'));
    return;
  }

  const spinner = ora('Connecting to GitHub via MCP...').start();

  try {
    // We attempt to call the official GitHub MCP Server tools
    // Tool "search_issues" or "list_pull_requests" is commonly exposed.
    // For this example, we'll try to fetch issues and PRs by simulating the tool call
    // Note: The specific tool names depend on the exact @modelcontextprotocol/server-github implementation.
    // Usually it exposes: "get_issue", "create_issue", "search_repositories", etc.
    
    spinner.text = `Fetching data for ${repoInfo.owner}/${repoInfo.repo}...`;

    // Attempt to search for open issues
    const issuesResponse = await mcpManager.callGitHubTool('search_issues', {
      query: `repo:${repoInfo.owner}/${repoInfo.repo} is:issue is:open`
    });

    spinner.succeed('Successfully fetched remote status via MCP!\n');

    console.log(chalk.bold.blue(`📦 Repository: ${repoInfo.owner}/${repoInfo.repo}`));
    
    // Parse MCP Tool Response
    if (issuesResponse && issuesResponse.content && issuesResponse.content.length > 0) {
      const resultText = issuesResponse.content[0].text;
      
      try {
        // The GitHub MCP server usually returns JSON text inside the content block
        const issuesData = JSON.parse(resultText);
        
        console.log(chalk.bold.green('\n🐛 Open Issues:'));
        if (issuesData.items && issuesData.items.length > 0) {
          issuesData.items.forEach(issue => {
            console.log(chalk.white(`  #${issue.number} - ${issue.title}`) + chalk.dim(` (@${issue.user.login})`));
          });
        } else {
          console.log(chalk.dim('  No open issues found.'));
        }
      } catch (e) {
        // If not JSON, just print the text
        console.log(chalk.dim(resultText));
      }
    } else {
      console.log(chalk.dim('No data returned from MCP server.'));
    }

    console.log('\n' + chalk.dim('Powered by @modelcontextprotocol/server-github'));

  } catch (error) {
    spinner.fail('MCP Connection Failed');
    console.error(chalk.red(error.message));
    console.log(chalk.dim('Tip: Make sure you have a valid GITHUB_PERSONAL_ACCESS_TOKEN in your .env file.'));
  }
}
