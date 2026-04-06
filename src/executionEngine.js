import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { buildRepoContext } from './repoContext.js';
import { generateRecoveryPlan } from './planningEngine.js';
import { annotatePlanWithRisk, assessCommandRisk } from './planUtils.js';
import { createExecutionSession, saveExecutionSession, writeErrorLog, writePlanLog } from './logger.js';
import { getCurrentBranch, getHeadSha, isWorkingTreeClean, listLocalBranches, runGit } from './gitUtils.js';

function createExecutionSnapshot() {
  return {
    branch: getCurrentBranch(),
    head: getHeadSha(),
    workingTreeClean: isWorkingTreeClean(),
    branchesBefore: listLocalBranches()
  };
}

function executeShellCommand(command) {
  return execSync(command, {
    encoding: 'utf8',
    stdio: 'pipe'
  }).trim();
}

function printPartialExecutionSummary(session) {
  const completed = session.executedSteps.length;
  const pending = session.pendingSteps.length;

  console.log(chalk.yellow.bold('\nExecution summary:'));
  console.log(chalk.white(`Completed steps: `) + chalk.cyan(String(completed)));
  console.log(chalk.white(`Pending steps: `) + chalk.cyan(String(pending)));

  if (session.failedStep) {
    console.log(chalk.white(`Failed step: `) + chalk.red(`${session.failedStep.step}. ${session.failedStep.description}`));
  }
}

function attemptRollback(snapshot) {
  if (!snapshot?.workingTreeClean || !snapshot.branch || !snapshot.head) {
    return {
      attempted: false,
      success: false,
      message: 'Automatic rollback is only available when execution started from a clean working tree.'
    };
  }

  try {
    const currentBranch = getCurrentBranch();
    if (currentBranch && currentBranch !== snapshot.branch) {
      runGit(['checkout', snapshot.branch]);
    }

    runGit(['reset', '--hard', snapshot.head]);

    const currentBranches = listLocalBranches();
    const createdBranches = currentBranches.filter(branch => !snapshot.branchesBefore.includes(branch) && branch !== snapshot.branch);
    for (const branch of createdBranches) {
      runGit(['branch', '-D', branch]);
    }

    return {
      attempted: true,
      success: true,
      message: 'Repository restored to the snapshot taken before execution.'
    };
  } catch (error) {
    return {
      attempted: true,
      success: false,
      message: error.message
    };
  }
}

async function runRecoveryFlow(step, error, session, sessionPath) {
  const repoContext = buildRepoContext();
  const recovery = await generateRecoveryPlan(step, error.message, repoContext, session.executedSteps);
  session.retryHistory.push({
    step: step.step,
    generatedAt: new Date().toISOString(),
    recovery
  });
  saveExecutionSession(sessionPath, session);

  if (recovery.summary) {
    console.log(chalk.yellow.bold('\nSelf-healing recovery plan:'));
    console.log(chalk.white(recovery.summary));
  }

  for (const recoveryStep of recovery.retryCommands) {
    const risk = assessCommandRisk(recoveryStep.command);
    if (risk.level === 'high') {
      console.log(chalk.red(`Skipping risky recovery command: ${recoveryStep.command}`));
      return false;
    }

    console.log(chalk.cyan(`Applying recovery step: ${recoveryStep.description}`));
    executeShellCommand(recoveryStep.command);
  }

  if (recovery.retryOriginalStep) {
    console.log(chalk.cyan(`Retrying failed step: ${step.description}`));
    executeShellCommand(step.command);
  }

  return true;
}

export async function executePlan(plan, options = {}) {
  const isDryRun = typeof options === 'boolean' ? options : options.isDryRun === true;
  if (!plan || plan.length === 0) {
    console.log(chalk.yellow('No plan to execute.'));
    return;
  }

  const annotatedPlan = annotatePlanWithRisk(plan);
  const { session, filePath: sessionPath } = createExecutionSession({
    isDryRun,
    startedFromBranch: getCurrentBranch()
  });
  session.plan = annotatedPlan;
  session.snapshot = createExecutionSnapshot();
  session.pendingSteps = annotatedPlan.map(step => ({
    step: step.step,
    command: step.command,
    description: step.description
  }));
  session.riskSummary = {
    highest: annotatedPlan.reduce((highest, step) => {
      const priority = { low: 1, medium: 2, high: 3 };
      return priority[step.risk.level] > priority[highest] ? step.risk.level : highest;
    }, 'low')
  };
  writePlanLog({
    createdAt: new Date().toISOString(),
    plan: annotatedPlan
  });
  saveExecutionSession(sessionPath, session);

  for (const step of annotatedPlan) {
    console.log();
    const spinner = ora({
      text: chalk.cyan(`Executing step ${step.step}: ${step.description}`),
      color: 'blue'
    }).start();

    if (isDryRun) {
      spinner.info(`[Dry Run] Command: ${step.command}`);
      session.executedSteps.push({
        step: step.step,
        command: step.command,
        description: step.description,
        risk: step.risk,
        status: 'dry-run',
        output: ''
      });
      session.pendingSteps = session.pendingSteps.filter(item => item.step !== step.step);
      saveExecutionSession(sessionPath, session);
      continue;
    }

    if (step.command.includes('rm -rf') || step.command.includes('git push -f')) {
      spinner.warn(chalk.red(`Blocked dangerous command: ${step.command}`));
      session.failedStep = {
        step: step.step,
        command: step.command,
        description: step.description,
        error: 'Blocked dangerous command.'
      };
      session.pendingSteps = session.pendingSteps.filter(item => item.step !== step.step);
      session.status = 'blocked';
      session.rollback = attemptRollback(session.snapshot);
      session.outcome = {
        success: false,
        reason: 'Blocked dangerous command'
      };
      saveExecutionSession(sessionPath, session);
      printPartialExecutionSummary(session);
      break;
    }

    try {
      const output = executeShellCommand(step.command);
      spinner.succeed(chalk.green(`Success: ${step.description}`));
      if (output.trim()) {
        console.log(chalk.dim(output.trim()));
      }

      session.executedSteps.push({
        step: step.step,
        command: step.command,
        description: step.description,
        risk: step.risk,
        status: 'success',
        output
      });
      session.pendingSteps = session.pendingSteps.filter(item => item.step !== step.step);
      saveExecutionSession(sessionPath, session);
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${step.description}`));
      console.log(chalk.dim(error.message));

      session.failedStep = {
        step: step.step,
        command: step.command,
        description: step.description,
        error: error.message
      };
      session.pendingSteps = session.pendingSteps.filter(item => item.step !== step.step);
      saveExecutionSession(sessionPath, session);

      let recovered = false;
      try {
        recovered = await runRecoveryFlow(step, error, session, sessionPath);
      } catch (recoveryError) {
        writeErrorLog({
          type: 'recovery-failure',
          step,
          error: recoveryError.message
        });
        console.log(chalk.red(`Recovery failed: ${recoveryError.message}`));
      }

      if (recovered) {
        spinner.succeed(chalk.green(`Recovered and completed: ${step.description}`));
        session.executedSteps.push({
          step: step.step,
          command: step.command,
          description: step.description,
          risk: step.risk,
          status: 'recovered',
          output: ''
        });
        saveExecutionSession(sessionPath, session);
        continue;
      }

      session.rollback = attemptRollback(session.snapshot);
      session.status = session.rollback.success ? 'rolled_back' : 'failed';
      session.outcome = {
        success: false,
        reason: error.message
      };
      saveExecutionSession(sessionPath, session);
      writeErrorLog({
        type: 'execution-failure',
        step,
        error: error.message,
        rollback: session.rollback
      });

      if (session.rollback.attempted) {
        const rollbackColor = session.rollback.success ? chalk.green : chalk.red;
        console.log(rollbackColor(`Rollback: ${session.rollback.message}`));
      } else {
        console.log(chalk.yellow(`Rollback: ${session.rollback.message}`));
      }

      printPartialExecutionSummary(session);
      console.log(chalk.red.bold('\nExecution stopped due to error.'));
      return session;
    }
  }

  session.status = isDryRun ? 'dry-run-complete' : 'completed';
  session.outcome = {
    success: true
  };
  saveExecutionSession(sessionPath, session);
  console.log(chalk.green.bold('\nWorkflow complete.'));
  return session;
}
