import { buildRepoContext } from '../repoContext.js';
import { explainCommandIntent } from '../planningEngine.js';
import chalk from 'chalk';
import ora from 'ora';

export async function explainCommand(gitCommand) {
  const spinner = ora('Gathering repository context...').start();
  const context = buildRepoContext();
  
  spinner.text = 'Analyzing command intent...';

  try {
    let firstChunk = true;
    await explainCommandIntent(gitCommand, context, (chunk) => {
      if (firstChunk) {
        spinner.succeed('Analysis complete.\n');
        console.log(chalk.bold.blue(`Command: ${gitCommand}`));
        firstChunk = false;
      }
      process.stdout.write(chalk.white(chunk));
    });
    
    if (firstChunk) {
      // In case it returns an empty string or stream fails gracefully
      spinner.succeed('Analysis complete.\n');
      console.log(chalk.bold.blue(`Command: ${gitCommand}`));
    }
    
    console.log('\n');
  } catch (error) {
    spinner.fail('Error analyzing command');
    console.error(error.message);
  }
}
