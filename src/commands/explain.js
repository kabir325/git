import { buildRepoContext } from '../repoContext.js';
import { explainCommandIntent } from '../planningEngine.js';
import chalk from 'chalk';
import ora from 'ora';

export async function explainCommand(gitCommand) {
  const spinner = ora('Gathering repository context...').start();
  const context = buildRepoContext();
  
  spinner.text = 'Analyzing command intent...';

  try {
    const explanation = await explainCommandIntent(gitCommand, context);
    spinner.succeed('Analysis complete.\n');

    console.log(chalk.bold.blue(`Command: ${gitCommand}`));
    console.log(chalk.white(`${explanation}\n`));
  } catch (error) {
    spinner.fail('Error analyzing command');
    console.error(error.message);
  }
}
