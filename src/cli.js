import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { doCommand } from './commands/do.js';
import { commitCommand } from './commands/commit.js';
import { pushCommand } from './commands/push.js';
import { explainCommand } from './commands/explain.js';
import { suggestCommand } from './commands/suggest.js';
import { visualizeCommand } from './commands/visualize.js';
import { remoteStatusCommand } from './commands/remoteStatus.js';
import { settingsCommand } from './commands/settings.js';
import { configCommand } from './commands/config.js';
import { createPullRequestCommand } from './commands/pr.js';
import { undoCommand } from './commands/undo.js';
import { resolveConflictsCommand } from './commands/resolveConflicts.js';
import { evaluateModelsCommand } from './commands/evaluateModels.js';
import { getPackageVersion } from './packageInfo.js';

const program = new Command();

program
  .name('gitguide')
  .description('AI-powered execution engine for Git operations')
  .version(getPackageVersion());

program
  .command('init')
  .description('Interactively initialize GitGuide and configure remote MCP integrations')
  .action(initCommand);

program
  .command('do <instruction>')
  .description('Execute a natural language git instruction')
  .action(doCommand);

program
  .command('commit')
  .description('Generate an AI commit message based on your diff')
  .action(commitCommand);

program
  .command('push')
  .description('Intelligently push changes with dry-run and explanation')
  .action(pushCommand);

program
  .command('explain <git_command>')
  .description('Explain what a specific git command will do in this repo')
  .action(explainCommand);

program
  .command('suggest')
  .description('Suggest next logical git actions based on repository state')
  .action(suggestCommand);

program
  .command('visualize')
  .description('Visualize the git commit history and branches in a graph format')
  .action(visualizeCommand);

program
  .command('remote-status')
  .description('Use GitHub MCP Server to fetch remote status and repository insights')
  .action(remoteStatusCommand);

program
  .command('settings')
  .alias('setting')
  .description('Open interactive GitGuide configuration')
  .action(settingsCommand);

program
  .command('config')
  .description('Configure GitGuide defaults like auto execute, model, safety, and MCP')
  .action(configCommand);

program
  .command('pr')
  .description('Create a pull request for the current branch through GitHub MCP')
  .action(createPullRequestCommand);

program
  .command('undo')
  .description('Undo the latest GitGuide execution using the recorded execution snapshot')
  .action(undoCommand);

program
  .command('resolve-conflicts')
  .description('Guide the user through merge conflict resolution')
  .action(resolveConflictsCommand);

program
  .command('evaluate-models')
  .description('Compare Ollama models and store the preferred model in config')
  .action(evaluateModelsCommand);

program.parse(process.argv);
