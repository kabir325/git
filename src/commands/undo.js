import inquirer from 'inquirer';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { readLatestExecutionSession } from '../logger.js';
import { getCurrentBranch, listLocalBranches, runGit } from '../gitUtils.js';

function buildUndoPlan(session) {
  const snapshot = session.snapshot;
  if (!snapshot?.branch || !snapshot?.head) {
    return [];
  }

  const commands = [];
  const currentBranch = getCurrentBranch();

  if (currentBranch && currentBranch !== snapshot.branch) {
    commands.push({
      command: `git checkout ${snapshot.branch}`,
      description: `Return to ${snapshot.branch}`
    });
  }

  commands.push({
    command: `git reset --hard ${snapshot.head}`,
    description: 'Reset the repository to the snapshot commit'
  });

  const currentBranches = listLocalBranches();
  const createdBranches = currentBranches.filter(branch => !snapshot.branchesBefore.includes(branch) && branch !== snapshot.branch);

  for (const branch of createdBranches) {
    commands.push({
      command: `git branch -D ${branch}`,
      description: `Delete temporary branch ${branch}`
    });
  }

  return commands;
}

export async function undoCommand() {
  const latestExecution = readLatestExecutionSession();
  if (!latestExecution) {
    console.log(chalk.yellow('No execution history was found to undo.'));
    return;
  }

  const undoPlan = buildUndoPlan(latestExecution.session);
  if (undoPlan.length === 0) {
    console.log(chalk.yellow('GitGuide could not derive a safe undo plan from the latest execution.'));
    return;
  }

  console.log(chalk.bold.blue('\nUndo Plan:\n'));
  undoPlan.forEach((step, index) => {
    console.log(`${index + 1}. ${step.description}`);
    console.log(chalk.dim(`   > ${step.command}`));
  });

  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: 'Execute undo plan?',
    default: false
  }]);

  if (!confirm) {
    console.log(chalk.yellow('Undo cancelled.'));
    return;
  }

  for (const step of undoPlan) {
    execSync(step.command, { stdio: 'inherit' });
  }

  console.log(chalk.green('\nUndo completed.'));
}
