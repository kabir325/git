import { buildRepoContext } from '../repoContext.js';
import { explainCommandIntent } from '../planningEngine.js';
import { execSync } from 'child_process';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';

export async function pushCommand() {
  const spinner = ora('Analyzing push impact...').start();
  const context = buildRepoContext();

  try {
    const dryRunOutput = execSync('git push --dry-run', { stdio: 'pipe' }).toString();
    spinner.succeed('Dry-run completed.');

    console.log(chalk.bold.blue('\nPush Impact Analysis:'));
    console.log(chalk.dim(dryRunOutput));

    spinner.start('Generating AI explanation...');
    let firstChunk = true;
    await explainCommandIntent('git push', context, (chunk) => {
      if (firstChunk) {
        spinner.succeed('Explanation generated.\n');
        console.log(chalk.cyan.bold('AI Explanation:'));
        firstChunk = false;
      }
      process.stdout.write(chalk.white(chunk));
    });

    if (firstChunk) {
      spinner.succeed('Explanation generated.\n');
      console.log(chalk.cyan.bold('AI Explanation:'));
    }
    console.log('\n\n');

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Proceed with actual push?',
        default: true
      }
    ]);

    if (confirm) {
      execSync('git push', { stdio: 'inherit' });
      console.log(chalk.green('Push successful.'));
    } else {
      console.log(chalk.yellow('Push cancelled.'));
    }

  } catch (error) {
    spinner.fail('Error analyzing push impact');
    if (error.message.includes('fatal: The current branch')) {
      console.log(chalk.red('You have no upstream branch configured. Run "git push -u origin <branch>" first.'));
    } else {
      console.error(error.message);
    }
  }
}
