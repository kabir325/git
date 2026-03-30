import { buildRepoContext } from '../repoContext.js';
import { suggestNextActions } from '../planningEngine.js';
import chalk from 'chalk';
import ora from 'ora';

export async function suggestCommand() {
  const spinner = ora('Analyzing repository state...').start();
  const context = buildRepoContext();

  try {
    const suggestions = await suggestNextActions(context);
    spinner.succeed('Analysis complete.\n');

    console.log(chalk.bold.blue('Suggested Next Actions:'));
    console.log(chalk.white(`${suggestions}\n`));
  } catch (error) {
    spinner.fail('Error generating suggestions');
    console.error(error.message);
  }
}
