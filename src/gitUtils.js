import { execFileSync, execSync } from 'child_process';

export function runGit(args, options = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  }).trim();
}

export function tryGit(args, options = {}) {
  try {
    return {
      success: true,
      stdout: runGit(args, options),
      error: null
    };
  } catch (error) {
    return {
      success: false,
      stdout: '',
      error
    };
  }
}

export function runShellCommand(command, options = {}) {
  return execSync(command, {
    encoding: 'utf8',
    stdio: 'pipe',
    ...options
  }).trim();
}

export function getCurrentBranch() {
  return tryGit(['branch', '--show-current']).stdout;
}

export function getHeadSha() {
  return tryGit(['rev-parse', 'HEAD']).stdout;
}

export function getStatusShort() {
  return tryGit(['status', '--short']).stdout;
}

export function getRecentCommits(limit = 5) {
  return tryGit(['log', `-n`, String(limit), '--oneline']).stdout;
}

export function getRemoteInfo() {
  return tryGit(['remote', '-v']).stdout;
}

export function getDiffSummary() {
  return tryGit(['diff', '--stat']).stdout;
}

export function isWorkingTreeClean() {
  return !getStatusShort();
}

export function listLocalBranches() {
  const result = tryGit(['branch', '--format', '%(refname:short)']);
  return result.success ? result.stdout.split(/\r?\n/).map(item => item.trim()).filter(Boolean) : [];
}

export function listUnmergedFiles() {
  const result = tryGit(['diff', '--name-only', '--diff-filter=U']);
  return result.success ? result.stdout.split(/\r?\n/).map(item => item.trim()).filter(Boolean) : [];
}

export function getDefaultBranchGuess() {
  const remoteHead = tryGit(['symbolic-ref', 'refs/remotes/origin/HEAD']);
  if (remoteHead.success && remoteHead.stdout) {
    return remoteHead.stdout.split('/').pop();
  }

  const currentBranch = getCurrentBranch();
  return currentBranch || 'main';
}

export function remoteBranchExists(branchName) {
  const result = tryGit(['ls-remote', '--heads', 'origin', branchName]);
  return result.success && Boolean(result.stdout);
}

export function hasRemoteOrigin() {
  return Boolean(tryGit(['config', '--get', 'remote.origin.url']).stdout);
}
