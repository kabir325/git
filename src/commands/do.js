import ora from 'ora';
import chalk from 'chalk';
import { buildRepoContext } from '../repoContext.js';
import { generatePlan } from '../planningEngine.js';
import { promptSafetyLayer } from '../safetyLayer.js';

export async function doCommand(instruction) {
  const spinner = ora('Analyzing repository context...').start();

  try {
    const context = buildRepoContext();
    spinner.text = 'Generating execution plan with AI...';
    const planResult = await generatePlan(instruction, context);
    spinner.stop();

    if (!planResult?.plan?.length) {
      console.log(chalk.red('Failed to generate a valid plan from AI.'));
      return;
    }

    await promptSafetyLayer(planResult.plan);
  } catch (error) {
    spinner.fail('Error generating execution plan');
    console.log(chalk.red(error.message));
  }
}
