import inquirer from 'inquirer';
import chalk from 'chalk';
import { executePlan } from './executionEngine.js';

export async function promptSafetyLayer(plan) {
  console.log('\n---');
  console.log(chalk.bold.blue('Execution Plan:'));
  console.log('');
  
  plan.forEach((p, index) => {
    console.log(`${index + 1}. ${p.description}`);
    console.log(chalk.dim(`   > ${p.command}`));
  });

  console.log('---\n');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Proceed?',
      choices: [
        { name: 'Yes (Execute Plan)', value: 'yes' },
        { name: 'Edit (Modify Steps)', value: 'edit' },
        { name: 'No (Cancel)', value: 'no' }
      ]
    }
  ]);

  if (action === 'yes') {
    await executePlan(plan);
  } else if (action === 'edit') {
    await handleEditPlan(plan);
  } else {
    console.log(chalk.yellow('Execution cancelled.'));
  }
}

async function handleEditPlan(plan) {
  const choices = plan.map((p, i) => ({
    name: `[Step ${i + 1}] ${p.command} - ${p.description}`,
    value: i,
    checked: true
  }));

  const { selectedSteps } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedSteps',
      message: 'Select the steps you want to keep:',
      choices
    }
  ]);

  const newPlan = plan.filter((_, i) => selectedSteps.includes(i));
  if (newPlan.length === 0) {
    console.log(chalk.yellow('No steps selected. Execution cancelled.'));
    return;
  }

  // Confirm new plan
  console.log('\n---');
  console.log(chalk.bold.blue('Revised Execution Plan:'));
  newPlan.forEach((p, index) => {
    console.log(`${index + 1}. ${p.description}`);
    console.log(chalk.dim(`   > ${p.command}`));
  });
  console.log('---\n');

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Execute revised plan?',
      default: true
    }
  ]);

  if (confirm) {
    await executePlan(newPlan);
  } else {
    console.log(chalk.yellow('Execution cancelled.'));
  }
}
