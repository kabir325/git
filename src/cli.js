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

const program = new Command();

program
  .name('gitguide')
  .description('AI-powered execution engine for Git operations')
  .version('1.0.0');

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
  .description('Use GitHub MCP Server to fetch remote status (Issues, PRs)')
  .action(remoteStatusCommand);

program
  .command('settings')
  .alias('setting')
  .description('Open interactive GitGuide settings for remotes, auto execute, and MCP features')
  .action(settingsCommand);

program.parse(process.argv);
