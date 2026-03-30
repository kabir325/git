import { Command } from 'commander';
import { doCommand } from './commands/do.js';
import { commitCommand } from './commands/commit.js';
import { pushCommand } from './commands/push.js';
import { explainCommand } from './commands/explain.js';
import { suggestCommand } from './commands/suggest.js';
import { visualizeCommand } from './commands/visualize.js';

const program = new Command();

program
  .name('gitguide')
  .description('AI-powered execution engine for Git operations')
  .version('1.0.0');

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

program.parse(process.argv);
