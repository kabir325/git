import inquirer from 'inquirer';
import chalk from 'chalk';
import { execSync } from 'child_process';
import ora from 'ora';
import {
  ensureGitignoreEntry,
  setGitHubMcpEnabled,
  upsertEnvVar
} from '../configStore.js';

export async function initCommand() {
  console.log(chalk.bold.blue('\nWelcome to GitGuide Initialization! 🧭\n'));
  console.log(chalk.dim('Let\'s set up your repository and configure your intelligent git assistant.\n'));

  // 1. Check/Set Remote Repository
  let currentRemote = '';
  try {
    currentRemote = execSync('git config --get remote.origin.url', { stdio: 'pipe' }).toString().trim();
  } catch (e) {
    // No remote found
  }

  if (currentRemote) {
    console.log(chalk.green(`✓ Remote origin already set to: `) + chalk.white(currentRemote));
  } else {
    console.log(chalk.yellow('ℹ No remote repository found.'));
    const { setupRemote } = await inquirer.prompt([{
      type: 'confirm',
      name: 'setupRemote',
      message: 'Would you like to link this local repository to a remote URL?',
      default: true
    }]);

    if (setupRemote) {
      const { remoteUrl } = await inquirer.prompt([{
        type: 'input',
        name: 'remoteUrl',
        message: 'Enter the remote repository URL (e.g., https://github.com/user/repo.git):',
        validate: input => input.length > 0 || 'URL cannot be empty.'
      }]);
      
      try {
        execSync(`git remote add origin ${remoteUrl}`);
        console.log(chalk.green('✓ Remote origin successfully added.\n'));
      } catch (e) {
        console.log(chalk.red('Failed to add remote. Ensure git is initialized (git init) first.\n'));
      }
    }
  }

  console.log('');

  // 2. Configure MCP (Model Context Protocol) Integration
  console.log(chalk.bold.cyan('--- AI & Remote Integration (MCP) ---'));
  console.log(chalk.dim('GitGuide can connect directly to GitHub to read your open issues and pull requests.\n'));

  const { enableMcp } = await inquirer.prompt([{
    type: 'confirm',
    name: 'enableMcp',
    message: 'Would you like to enable GitHub MCP integration?',
    default: false
  }]);

  let mcpToken = '';
  if (enableMcp) {
    const { token } = await inquirer.prompt([{
      type: 'password',
      name: 'token',
      message: 'Enter your GitHub Personal Access Token (this will be saved locally to .env):',
      mask: '*'
    }]);
    mcpToken = token;
  }

  // 3. Save Configurations
  const spinner = ora('Saving configuration...').start();

  try {
    setGitHubMcpEnabled(enableMcp);

    if (enableMcp && mcpToken) {
      upsertEnvVar('GITHUB_PERSONAL_ACCESS_TOKEN', mcpToken);
      ensureGitignoreEntry('.env');
    }

    spinner.succeed(chalk.green('Configuration saved successfully!'));

    console.log(chalk.bold.green('\n🎉 GitGuide is ready to use!'));
    console.log(chalk.white('Try running:'));
    console.log(chalk.cyan('  gitguide suggest'));
    if (enableMcp) {
      console.log(chalk.cyan('  gitguide remote-status'));
    }

  } catch (error) {
    spinner.fail(chalk.red('Failed to save configuration.'));
    console.error(error.message);
  }
}
