import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { execFileSync } from 'child_process';
import { getConfig } from '../config.js';
import {
  ensureGitignoreEntry,
  removeEnvVar,
  setAutoExecuteEnabled,
  setDefaultBranch,
  setGitHubMcpEnabled,
  setPreferredModel,
  setSafetyLevel,
  upsertEnvVar
} from '../configStore.js';

function getRemoteOrigin() {
  try {
    return execFileSync('git', ['config', '--get', 'remote.origin.url'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

function renderCurrentSettings(config) {
  const remote = getRemoteOrigin() || 'Not configured';
  const mcpState = config.mcp.github.enabled ? 'Enabled' : 'Disabled';
  const tokenState = config.mcp.github.token ? 'Configured' : 'Missing';
  const autoExecuteState = config.execution.autoExecute ? 'Enabled' : 'Disabled';

  console.log(chalk.bold.blue('\nGitGuide Config\n'));
  console.log(chalk.white(`Remote origin: `) + chalk.cyan(remote));
  console.log(chalk.white(`Auto execute: `) + chalk.cyan(autoExecuteState));
  console.log(chalk.white(`Default branch: `) + chalk.cyan(config.defaultBranch));
  console.log(chalk.white(`Preferred model: `) + chalk.cyan(config.preferredModel));
  console.log(chalk.white(`Safety level: `) + chalk.cyan(config.safetyLevel));
  console.log(chalk.white(`GitHub MCP: `) + chalk.cyan(mcpState));
  console.log(chalk.white(`GitHub token: `) + chalk.cyan(tokenState));
  console.log('');
}

function truncateValue(value, maxLength = 58) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function buildSettingsChoices(config) {
  const remote = truncateValue(getRemoteOrigin() || 'Not configured');
  const autoExecuteState = config.execution.autoExecute ? 'Enabled' : 'Disabled';
  const mcpState = config.mcp.github.enabled ? 'Enabled' : 'Disabled';
  const tokenState = config.mcp.github.token ? 'Configured' : 'Missing';

  return [
    {
      name: `Remote origin: ${remote}`,
      value: 'remote',
      description: 'Update the GitHub repository remote URL'
    },
    {
      name: `Auto execute: ${autoExecuteState}`,
      value: 'auto-execute',
      description: 'Skip approval prompts and run the plan automatically'
    },
    {
      name: `Default branch: ${config.defaultBranch}`,
      value: 'default-branch',
      description: 'Choose the branch GitGuide treats as the repository base'
    },
    {
      name: `Preferred model: ${config.preferredModel}`,
      value: 'preferred-model',
      description: 'Select the Ollama model used for planning and explanations'
    },
    {
      name: `Safety level: ${config.safetyLevel}`,
      value: 'safety-level',
      description: 'Control when GitGuide requires confirmation for risky steps'
    },
    {
      name: `GitHub MCP: ${mcpState}`,
      value: 'mcp',
      description: 'Enable or disable GitHub MCP integration'
    },
    {
      name: `GitHub token: ${tokenState}`,
      value: 'token',
      description: 'Save or replace the Personal Access Token in .env'
    },
    {
      name: 'Remove GitHub token',
      value: 'remove-token',
      description: 'Delete the token from the local .env file'
    },
    {
      name: 'Exit settings',
      value: 'exit',
      description: 'Close the interactive settings screen'
    }
  ];
}

async function updateRemoteOrigin() {
  const currentRemote = getRemoteOrigin();
  const { remoteUrl } = await inquirer.prompt([{
    type: 'input',
    name: 'remoteUrl',
    message: currentRemote
      ? 'Enter the new remote origin URL:'
      : 'Enter the remote origin URL:',
    default: currentRemote || undefined,
    validate: input => input.trim().length > 0 || 'URL cannot be empty.'
  }]);

  const spinner = ora('Updating remote origin...').start();

  try {
    if (currentRemote) {
      execFileSync('git', ['remote', 'set-url', 'origin', remoteUrl], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } else {
      execFileSync('git', ['remote', 'add', 'origin', remoteUrl], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    }

    spinner.succeed('Remote origin updated.');
  } catch (error) {
    spinner.fail('Failed to update remote origin.');
    console.log(chalk.red(error.message));
  }
}

async function updateDefaultBranchSetting(config) {
  const { defaultBranch } = await inquirer.prompt([{
    type: 'input',
    name: 'defaultBranch',
    message: 'Enter the default branch name:',
    default: config.defaultBranch,
    validate: input => input.trim().length > 0 || 'Branch name cannot be empty.'
  }]);

  setDefaultBranch(defaultBranch.trim());
  console.log(chalk.green('Default branch updated.'));
}

async function updatePreferredModelSetting(config) {
  const { preferredModel } = await inquirer.prompt([{
    type: 'input',
    name: 'preferredModel',
    message: 'Enter the preferred Ollama model name:',
    default: config.preferredModel,
    validate: input => input.trim().length > 0 || 'Model name cannot be empty.'
  }]);

  setPreferredModel(preferredModel.trim());
  console.log(chalk.green('Preferred model updated.'));
}

async function updateSafetyLevelSetting(config) {
  const { safetyLevel } = await inquirer.prompt([{
    type: 'list',
    name: 'safetyLevel',
    message: 'Choose the safety level:',
    default: config.safetyLevel,
    choices: [
      { name: 'strict', value: 'strict' },
      { name: 'balanced', value: 'balanced' },
      { name: 'relaxed', value: 'relaxed' }
    ]
  }]);

  setSafetyLevel(safetyLevel);
  console.log(chalk.green('Safety level updated.'));
}

function toggleAutoExecute(config) {
  const nextEnabled = !config.execution.autoExecute;
  const spinner = ora(`${nextEnabled ? 'Enabling' : 'Disabling'} auto execute...`).start();

  try {
    setAutoExecuteEnabled(nextEnabled);
    spinner.succeed(`Auto execute ${nextEnabled ? 'enabled' : 'disabled'}.`);
  } catch (error) {
    spinner.fail('Failed to update auto execute setting.');
    console.log(chalk.red(error.message));
  }
}

async function toggleGitHubMcp() {
  const config = getConfig();
  const nextEnabled = !config.mcp.github.enabled;
  const spinner = ora(`${nextEnabled ? 'Enabling' : 'Disabling'} GitHub MCP...`).start();

  try {
    setGitHubMcpEnabled(nextEnabled);

    if (nextEnabled && !config.mcp.github.token) {
      spinner.stop();
      const { token } = await inquirer.prompt([{
        type: 'password',
        name: 'token',
        message: 'Enter your GitHub Personal Access Token:',
        mask: '*',
        validate: input => input.trim().length > 0 || 'Token cannot be empty.'
      }]);

      upsertEnvVar('GITHUB_PERSONAL_ACCESS_TOKEN', token);
      ensureGitignoreEntry('.env');
      console.log(chalk.green('GitHub MCP enabled and token saved.'));
      return;
    }

    spinner.succeed(`GitHub MCP ${nextEnabled ? 'enabled' : 'disabled'}.`);
  } catch (error) {
    spinner.fail('Failed to update GitHub MCP setting.');
    console.log(chalk.red(error.message));
  }
}

async function updateGitHubToken() {
  const { token } = await inquirer.prompt([{
    type: 'password',
    name: 'token',
    message: 'Enter the GitHub Personal Access Token to save:',
    mask: '*',
    validate: input => input.trim().length > 0 || 'Token cannot be empty.'
  }]);

  const spinner = ora('Saving GitHub token...').start();

  try {
    upsertEnvVar('GITHUB_PERSONAL_ACCESS_TOKEN', token);
    ensureGitignoreEntry('.env');
    spinner.succeed('GitHub token saved locally.');
  } catch (error) {
    spinner.fail('Failed to save GitHub token.');
    console.log(chalk.red(error.message));
  }
}

function removeGitHubToken() {
  const spinner = ora('Removing GitHub token...').start();

  try {
    removeEnvVar('GITHUB_PERSONAL_ACCESS_TOKEN');
    spinner.succeed('GitHub token removed from local .env.');
  } catch (error) {
    spinner.fail('Failed to remove GitHub token.');
    console.log(chalk.red(error.message));
  }
}

export async function settingsCommand() {
  let shouldExit = false;

  while (!shouldExit) {
    const config = getConfig();
    renderCurrentSettings(config);

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'Select a setting to edit:',
      loop: false,
      pageSize: 8,
      choices: buildSettingsChoices(config)
    }]);

    if (action === 'remote') {
      await updateRemoteOrigin();
      continue;
    }

    if (action === 'auto-execute') {
      toggleAutoExecute(config);
      continue;
    }

    if (action === 'default-branch') {
      await updateDefaultBranchSetting(config);
      continue;
    }

    if (action === 'preferred-model') {
      await updatePreferredModelSetting(config);
      continue;
    }

    if (action === 'safety-level') {
      await updateSafetyLevelSetting(config);
      continue;
    }

    if (action === 'mcp') {
      await toggleGitHubMcp();
      continue;
    }

    if (action === 'token') {
      await updateGitHubToken();
      continue;
    }

    if (action === 'remove-token') {
      removeGitHubToken();
      continue;
    }

    shouldExit = true;
  }

  console.log(chalk.green('\nDone updating GitGuide config.\n'));
}
