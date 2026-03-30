import { buildRepoContext, getDiff } from '../repoContext.js';
import { generateCommitMessage } from '../planningEngine.js';
import { execSync } from 'child_process';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';

export async function commitCommand() {
  const spinner = ora('Checking staged changes...').start();
  
  try {
    const diff = getDiff('git diff --cached');
    
    if (!diff.trim()) {
      spinner.fail('No staged changes found. Run "git add" first.');
      return;
    }

    spinner.text = 'Analyzing diff and generating commit message...';
    const suggestedMessage = await generateCommitMessage(diff);
    spinner.succeed('Message generated.');

    console.log(chalk.bold.blue('\nSuggested Commit Message:'));
    console.log(chalk.green(`"${suggestedMessage}"\n`));

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'How would you like to proceed?',
        choices: [
          { name: 'Commit with this message', value: 'commit' },
          { name: 'Edit message manually', value: 'edit' },
          { name: 'Cancel', value: 'cancel' }
        ]
      }
    ]);

    if (action === 'commit') {
      execSync(`git commit -m "${suggestedMessage}"`, { stdio: 'inherit' });
      console.log(chalk.green('Changes committed successfully.'));
    } else if (action === 'edit') {
      const { finalMessage } = await inquirer.prompt([
        {
          type: 'input',
          name: 'finalMessage',
          message: 'Enter commit message:',
          default: suggestedMessage
        }
      ]);
      execSync(`git commit -m "${finalMessage}"`, { stdio: 'inherit' });
      console.log(chalk.green('Changes committed successfully.'));
    } else {
      console.log(chalk.yellow('Commit cancelled.'));
    }

  } catch (error) {
    spinner.fail('Error generating commit message');
    console.error(error.message);
  }
}
