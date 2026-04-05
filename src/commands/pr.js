import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { getConfig } from '../config.js';
import { getCurrentBranch, remoteBranchExists } from '../gitUtils.js';
import { getGitHubRepoInfo } from '../github.js';
import { mcpManager } from '../mcpManager.js';

export async function createPullRequestCommand() {
  const config = getConfig();

  if (!config.mcp.github.enabled) {
    console.log(chalk.yellow('GitHub MCP is not enabled. Enable it in gitguide config first.'));
    return;
  }

  const repoInfo = getGitHubRepoInfo();
  if (!repoInfo) {
    console.log(chalk.red('Could not determine the GitHub repository from remote origin.'));
    return;
  }

  const currentBranch = getCurrentBranch();
  if (!currentBranch) {
    console.log(chalk.red('Could not determine the current branch.'));
    return;
  }

  if (!remoteBranchExists(currentBranch)) {
    console.log(chalk.yellow(`Remote branch origin/${currentBranch} does not exist yet. Push the branch before creating a PR.`));
    return;
  }

  const { title, body, base } = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: 'Pull request title:',
      default: `Merge ${currentBranch} into ${config.defaultBranch}`,
      validate: input => input.trim().length > 0 || 'Title cannot be empty.'
    },
    {
      type: 'input',
      name: 'body',
      message: 'Pull request description:',
      default: `Automated PR created by GitGuide for branch ${currentBranch}.`
    },
    {
      type: 'input',
      name: 'base',
      message: 'Base branch:',
      default: config.defaultBranch,
      validate: input => input.trim().length > 0 || 'Base branch cannot be empty.'
    }
  ]);

  const spinner = ora('Creating pull request via GitHub MCP...').start();

  try {
    const response = await mcpManager.callGitHubTool('create_pull_request', {
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      title: title.trim(),
      body: body.trim(),
      head: currentBranch,
      base: base.trim()
    });

    spinner.succeed('Pull request created successfully.');

    const text = response?.content?.find(item => typeof item.text === 'string')?.text;
    if (text) {
      console.log(chalk.cyan(text));
    }
  } catch (error) {
    spinner.fail('Failed to create pull request.');
    console.log(chalk.red(error.message));
  }
}
