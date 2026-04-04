import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { callOllama } from './planningEngine.js';

export async function executePlan(plan, isDryRun = false) {
  if (!plan || plan.length === 0) {
    console.log(chalk.yellow('No plan to execute.'));
    return;
  }

  for (const step of plan) {
    console.log();
    const spinner = ora({
      text: chalk.cyan(`Executing step ${step.step}: ${step.description}`),
      color: 'blue'
    }).start();

    if (isDryRun) {
      spinner.info(`[Dry Run] Command: ${step.command}`);
      continue;
    }

    // Safety checks
    if (step.command.includes('rm -rf') || step.command.includes('git push -f')) {
      spinner.warn(chalk.red(`Blocked dangerous command: ${step.command}`));
      break;
    }

    try {
      const output = execSync(step.command, { stdio: 'pipe' }).toString();
      spinner.succeed(chalk.green(`Success: ${step.description}`));
      if (output.trim()) {
        console.log(chalk.dim(output.trim()));
      }
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${step.description}`));
      console.log(chalk.dim(error.message));
      
      const fixPrompt = `
The Git command "${step.command}" failed with this error:
${error.message.substring(0, 1000)}

Please suggest a quick fix or next step to resolve this issue in natural language. Keep it brief.
`;
      let firstChunk = true;
      await callOllama(fixPrompt, 'deepseek-coder', null, (chunk) => {
        if (firstChunk) {
          console.log(chalk.yellow.bold('\nAI Suggestion to fix:'));
          firstChunk = false;
        }
        process.stdout.write(chalk.white(chunk));
      });
      
      console.log(chalk.red.bold('\n\nExecution stopped due to error.'));
      break;
    }
  }

  console.log(chalk.green.bold('\nWorkflow complete.'));
}
