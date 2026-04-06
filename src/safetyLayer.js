import inquirer from 'inquirer';
import chalk from 'chalk';
import { executePlan } from './executionEngine.js';
import { getConfig } from './config.js';
import { setAutoExecuteEnabled } from './configStore.js';
import { annotatePlanWithRisk, getHighestRiskLevel, shouldConfirmRisk } from './planUtils.js';

function getRiskColor(level) {
  if (level === 'high') {
    return chalk.red;
  }

  if (level === 'medium') {
    return chalk.yellow;
  }

  return chalk.green;
}

function renderPlan(plan, config) {
  const highestRisk = getHighestRiskLevel(plan);

  console.log('\n---');
  console.log(chalk.bold.blue('Execution Plan:'));
  console.log(chalk.dim(`Mode: ${config.execution.autoExecute ? 'Auto execute' : 'Manual approval'}`));
  console.log(chalk.dim(`Safety level: ${config.safetyLevel}`));
  console.log(chalk.dim(`Highest risk: ${highestRisk}`));
  console.log('');
  
  plan.forEach((step, index) => {
    const riskPainter = getRiskColor(step.risk.level);
    console.log(`${index + 1}. ${step.description}`);
    console.log(chalk.dim(`   > ${step.command}`));
    console.log(riskPainter(`   Risk: ${step.risk.level}`));
  });

  console.log('---\n');
}

export async function promptSafetyLayer(plan) {
  const config = getConfig();
  const annotatedPlan = annotatePlanWithRisk(plan);
  const riskySteps = annotatedPlan.filter(step => shouldConfirmRisk(step.risk.level, config.safetyLevel));
  renderPlan(annotatedPlan, config);

  if (config.execution.autoExecute && riskySteps.length === 0) {
    console.log(chalk.dim('Auto execute is enabled and no risky steps were detected. Running the plan now.\n'));
    await executePlan(annotatedPlan);
    return;
  }

  if (!config.execution.autoExecute && riskySteps.length === 0) {
    console.log(chalk.dim('No risky steps were detected. Running the plan without an approval prompt.'));
    console.log(chalk.dim('Tip: you can enable auto execute later from GitGuide config.\n'));
    await executePlan(annotatedPlan);
    return;
  }

  if (config.execution.autoExecute && riskySteps.length > 0) {
    console.log(chalk.yellow('Auto execute paused because this plan contains risky steps.\n'));
  } else {
    console.log(chalk.dim('Tip: you can enable auto execute later from GitGuide config.\n'));
  }

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Proceed?',
      choices: [
        { name: 'Yes (Execute Plan)', value: 'yes' },
        { name: 'Yes, and enable auto execute for future runs', value: 'enable-auto-execute' },
        { name: 'Edit (Modify Steps)', value: 'edit' },
        { name: 'No (Cancel)', value: 'no' }
      ]
    }
  ]);

  if (action === 'yes') {
    await executePlan(annotatedPlan);
  } else if (action === 'enable-auto-execute') {
    setAutoExecuteEnabled(true);
    console.log(chalk.green('Auto execute enabled for future runs.'));
    await executePlan(annotatedPlan);
  } else if (action === 'edit') {
    await handleEditPlan(annotatedPlan, config);
  } else {
    console.log(chalk.yellow('Execution cancelled.'));
  }
}

async function handleEditPlan(plan, config) {
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

  renderPlan(newPlan, config);

  const riskySteps = newPlan.filter(step => shouldConfirmRisk(step.risk.level, config.safetyLevel));
  if (riskySteps.length === 0) {
    console.log(chalk.dim('No risky steps remain in the revised plan. Running it now.\n'));
    await executePlan(newPlan);
    return;
  }

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
