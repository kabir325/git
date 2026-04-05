import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { buildRepoContext } from '../repoContext.js';
import { evaluateModelCandidates } from '../planningEngine.js';
import { setPreferredModel } from '../configStore.js';

export async function evaluateModelsCommand() {
  const { modelsInput } = await inquirer.prompt([{
    type: 'input',
    name: 'modelsInput',
    message: 'Enter Ollama models to compare (comma separated):',
    default: 'deepseek-coder,phi3'
  }]);

  const models = modelsInput
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  if (models.length === 0) {
    console.log(chalk.yellow('No models were provided.'));
    return;
  }

  const spinner = ora('Evaluating models...').start();

  try {
    const context = buildRepoContext();
    const results = await evaluateModelCandidates(models, context);
    spinner.succeed('Model evaluation completed.\n');

    results.forEach(result => {
      const statusColor = result.valid ? chalk.green : chalk.red;
      console.log(statusColor(`${result.model}`));
      console.log(chalk.white(`  Valid plan: `) + statusColor(result.valid ? 'yes' : 'no'));
      console.log(chalk.white(`  Duration: `) + chalk.cyan(`${result.durationMs} ms`));
      if (result.error) {
        console.log(chalk.white(`  Error: `) + chalk.red(result.error));
      }
      console.log('');
    });

    const bestResult = results.find(result => result.valid) || results[0];
    if (!bestResult) {
      return;
    }

    const { savePreferred } = await inquirer.prompt([{
      type: 'confirm',
      name: 'savePreferred',
      message: `Set ${bestResult.model} as the preferred model?`,
      default: true
    }]);

    if (savePreferred) {
      setPreferredModel(bestResult.model);
      console.log(chalk.green(`Preferred model updated to ${bestResult.model}.`));
    }
  } catch (error) {
    spinner.fail('Model evaluation failed.');
    console.log(chalk.red(error.message));
  }
}
