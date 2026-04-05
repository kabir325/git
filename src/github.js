import { execSync } from 'child_process';

export function getGitHubRepoInfo() {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { stdio: 'pipe' }).toString().trim();
    const match = remoteUrl.match(/github\.com[:\/]([^\/]+)\/(.+?)(\.git)?$/);
    if (match && match.length >= 3) {
      return { owner: match[1], repo: match[2].replace('.git', '') };
    }
  } catch {
    return null;
  }

  return null;
}
