import { buildRepoContext } from '../repoContext.js';
import { generatePlan } from '../planningEngine.js';
import { promptSafetyLayer } from '../safetyLayer.js';
import ora from 'ora';
import chalk from 'chalk';

export async function doCommand(instruction) {
  const spinner = ora('Analyzing repository context...').start();
  const context = buildRepoContext();
  spinner.text = 'Generating execution plan with AI...';

  try {
    const planResult = await generatePlan(instruction, context);
    spinner.stop();

    if (!planResult || !planResult.plan) {
      console.log(chalk.red('Failed to generate a valid plan from AI.'));
      return;
    }

    await promptSafetyLayer(planResult.plan);
  } catch (error) {
    spinner.fail('Error generating plan');
    console.error(error);
  }
}
