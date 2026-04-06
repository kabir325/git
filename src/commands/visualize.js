import fs from 'fs';
import path from 'path';
import open from 'open';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import { getGitGuideDir } from '../logger.js';

function runGit(command) {
  try {
    return execSync(command, { stdio: 'pipe' }).toString().trim();
  } catch {
    return '';
  }
}

export async function visualizeCommand() {
  const spinner = ora('Building repository visualization...').start();

  try {
    const graph = runGit('git log --graph --decorate --oneline --all -n 40');
    const branches = runGit('git branch -a -vv');
    const commits = runGit('git log --pretty=format:"%h|%an|%ad|%s" --date=short -n 20');

    const rows = commits
      .split(/\r?\n/)
      .filter(Boolean)
      .map(line => {
        const [sha, author, date, message] = line.split('|');
        return `<tr><td>${sha}</td><td>${author}</td><td>${date}</td><td>${message}</td></tr>`;
      })
      .join('');

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>GitGuide Visualization</title>
  <style>
    body { background:#0f172a; color:#e2e8f0; font-family:Segoe UI, Arial, sans-serif; margin:0; padding:24px; }
    h1,h2 { margin:0 0 12px; }
    .grid { display:grid; grid-template-columns:1.2fr 1fr; gap:24px; }
    .card { background:#111827; border:1px solid #1f2937; border-radius:16px; padding:20px; }
    pre { white-space:pre-wrap; font-family:Consolas, monospace; color:#cbd5e1; }
    table { width:100%; border-collapse:collapse; }
    th, td { padding:10px; border-bottom:1px solid #1f2937; text-align:left; }
    th { color:#93c5fd; }
  </style>
</head>
<body>
  <h1>GitGuide Repository Visualization</h1>
  <div class="grid">
    <div class="card">
      <h2>Commit Graph</h2>
      <pre>${graph || 'No graph data available.'}</pre>
    </div>
    <div class="card">
      <h2>Branches</h2>
      <pre>${branches || 'No branch data available.'}</pre>
    </div>
  </div>
  <div class="card" style="margin-top:24px;">
    <h2>Recent Commits</h2>
    <table>
      <thead>
        <tr><th>SHA</th><th>Author</th><th>Date</th><th>Message</th></tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="4">No commits found.</td></tr>'}</tbody>
    </table>
  </div>
</body>
</html>`;

    const graphDir = getGitGuideDir(process.cwd());
    const htmlPath = path.join(graphDir, 'graph.html');
    fs.writeFileSync(htmlPath, html);

    spinner.succeed('Visualization generated.');
    await open(htmlPath);
    console.log(chalk.green(`Opened visualization: ${htmlPath}`));
  } catch (error) {
    spinner.fail('Failed to build visualization.');
    console.log(chalk.red(error.message));
  }
}
