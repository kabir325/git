import inquirer from 'inquirer';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { listUnmergedFiles } from '../gitUtils.js';

export async function resolveConflictsCommand() {
  const conflicts = listUnmergedFiles();

  if (conflicts.length === 0) {
    console.log(chalk.green('No merge conflicts detected.'));
    return;
  }

  console.log(chalk.bold.red('\nMerge conflicts detected:\n'));
  conflicts.forEach(file => {
    console.log(chalk.white(`- ${file}`));
  });

  console.log(chalk.dim('\nResolve the files in your editor, then come back to GitGuide to stage them.\n'));

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      { name: 'Stage all resolved files now', value: 'stage' },
      { name: 'Show Git status', value: 'status' },
      { name: 'Cancel', value: 'cancel' }
    ]
  }]);

  if (action === 'stage') {
    execSync('git add .', { stdio: 'inherit' });
    console.log(chalk.green('Staged all resolved files.'));
    return;
  }

  if (action === 'status') {
    execSync('git status', { stdio: 'inherit' });
    return;
  }

  console.log(chalk.yellow('Conflict resolver cancelled.'));
}
