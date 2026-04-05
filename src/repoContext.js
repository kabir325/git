import fs from 'fs';
import path from 'path';
import { getGitGuideDir } from './logger.js';
import {
  getCurrentBranch,
  getDiffSummary,
  getRemoteInfo,
  getRecentCommits,
  getStatusShort,
  runShellCommand
} from './gitUtils.js';

function getAheadBehind(currentBranch) {
  if (!currentBranch) {
    return '0 0';
  }

  try {
    return runShellCommand(`git rev-list --left-right --count origin/${currentBranch}...${currentBranch}`);
  } catch {
    return '0 0';
  }
}

export function buildRepoContext() {
  const currentBranch = getCurrentBranch();
  const context = {
    status: getStatusShort(),
    diffSummary: getDiffSummary(),
    currentBranch,
    remoteInfo: getRemoteInfo(),
    recentCommits: getRecentCommits(),
    aheadBehind: getAheadBehind(currentBranch)
  };

  saveContext(context);
  return context;
}

function saveContext(context) {
  const dir = getGitGuideDir(process.cwd());

  fs.writeFileSync(
    path.join(dir, 'repo_summary.json'),
    JSON.stringify(context, null, 2)
  );

  const historyPath = path.join(dir, 'history.json');
  let history = [];

  if (fs.existsSync(historyPath)) {
    try {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch {
      history = [];
    }
  }

  history.push({
    timestamp: new Date().toISOString(),
    branch: context.currentBranch
  });

  if (history.length > 50) {
    history = history.slice(history.length - 50);
  }

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

export function getDiff(command = 'git diff') {
  try {
    return runShellCommand(command);
  } catch {
    return '';
  }
}

export function getCachedContext() {
  const contextPath = path.join(getGitGuideDir(process.cwd()), 'repo_summary.json');
  if (fs.existsSync(contextPath)) {
    return JSON.parse(fs.readFileSync(contextPath, 'utf8'));
  }

  return buildRepoContext();
}
