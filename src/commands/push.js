import { buildRepoContext } from '../repoContext.js';
import { explainCommandIntent } from '../planningEngine.js';
import { execSync } from 'child_process';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { getConfig } from '../config.js';
import { getCurrentBranch } from '../gitUtils.js';
import { createPullRequestCommand } from './pr.js';

export async function pushCommand() {
  const spinner = ora('Analyzing push impact...').start();
  const context = buildRepoContext();
  const config = getConfig();

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

      const currentBranch = getCurrentBranch();
      if (currentBranch && currentBranch !== config.defaultBranch) {
        console.log(chalk.dim(`Tip: this branch differs from your default branch (${config.defaultBranch}).`));

        if (config.mcp.github.enabled) {
          const { createPrNow } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'createPrNow',
              message: 'Would you like GitGuide to help create a pull request now?',
              default: false
            }
          ]);

          if (createPrNow) {
            await createPullRequestCommand();
          } else {
            console.log(chalk.cyan('You can run "gitguide pr" whenever you are ready to open a pull request.'));
          }
        } else {
          console.log(chalk.cyan('You can enable GitHub MCP and run "gitguide pr" to create a pull request from the terminal.'));
        }
      }
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
