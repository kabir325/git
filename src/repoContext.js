import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function runGitCommand(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe' }).toString().trim();
  } catch (error) {
    return '';
  }
}

export function buildRepoContext() {
  const status = runGitCommand('git status --short');
  const diffSummary = runGitCommand('git diff --stat');
  const currentBranch = runGitCommand('git branch --show-current');
  const remoteInfo = runGitCommand('git remote -v');
  const recentCommits = runGitCommand('git log -n 5 --oneline');

  // Commits ahead/behind (assuming origin and current branch tracking exists)
  let aheadBehind = '';
  if (currentBranch) {
    aheadBehind = runGitCommand(`git rev-list --left-right --count origin/${currentBranch}...${currentBranch} 2>/dev/null`) || '0 0';
  }

  const context = {
    status,
    diffSummary,
    currentBranch,
    remoteInfo,
    recentCommits,
    aheadBehind
  };

  saveContext(context);
  return context;
}

function saveContext(context) {
  const dir = path.join(process.cwd(), '.gitguide');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(dir, 'repo_summary.json'),
    JSON.stringify(context, null, 2)
  );

  // Append to history
  const historyPath = path.join(dir, 'history.json');
  let history = [];
  if (fs.existsSync(historyPath)) {
    try {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch (e) {
      history = [];
    }
  }

  history.push({
    timestamp: new Date().toISOString(),
    branch: context.currentBranch
  });

  // Keep last 50 history items
  if (history.length > 50) {
    history = history.slice(history.length - 50);
  }

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

export function getDiff(cmd = 'git diff') {
  return runGitCommand(cmd);
}

export function getCachedContext() {
  const contextPath = path.join(process.cwd(), '.gitguide', 'repo_summary.json');
  if (fs.existsSync(contextPath)) {
    return JSON.parse(fs.readFileSync(contextPath, 'utf8'));
  }
  return buildRepoContext();
}
