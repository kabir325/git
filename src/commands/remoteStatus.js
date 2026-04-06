import ora from 'ora';
import chalk from 'chalk';
import { mcpManager } from '../mcpManager.js';
import { getConfig } from '../config.js';
import { getCurrentBranch, remoteBranchExists } from '../gitUtils.js';
import { getGitHubRepoInfo } from '../github.js';

function extractTextContent(response) {
  const textBlock = response?.content?.find(block => typeof block.text === 'string');
  return textBlock?.text || '';
}

function parseMcpPayload(response) {
  const text = extractTextContent(response).trim();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function normalizeCollection(payload) {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
}

function formatDate(value) {
  if (!value) {
    return 'unknown';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatCountLine(label, count) {
  return `${chalk.white(label)} ${chalk.cyan(String(count))}`;
}

function formatIssueLine(issue) {
  const author = issue?.user?.login || 'unknown';
  return chalk.white(`  #${issue.number} - ${issue.title}`) + chalk.dim(` (@${author})`);
}

function formatPullRequestLine(pr) {
  const author = pr?.user?.login || 'unknown';
  return chalk.white(`  #${pr.number} - ${pr.title}`) + chalk.dim(` (@${author})`);
}

function formatCommitLine(commit) {
  const sha = commit?.sha?.slice(0, 7) || 'unknown';
  const message = commit?.commit?.message?.split('\n')[0] || 'No commit message';
  const author = commit?.commit?.author?.name || 'unknown';
  return chalk.white(`  ${sha} - ${message}`) + chalk.dim(` (${author})`);
}

function getRepositorySummary(payload, owner, repo) {
  const items = normalizeCollection(payload);
  const repository = items.find(item =>
    item?.full_name?.toLowerCase() === `${owner}/${repo}`.toLowerCase()
  ) || items[0];

  if (!repository) {
    return null;
  }

  return {
    fullName: repository.full_name || `${owner}/${repo}`,
    description: repository.description || 'No description',
    visibility: repository.private ? 'Private' : 'Public',
    defaultBranch: repository.default_branch || 'unknown',
    stars: repository.stargazers_count ?? 0,
    forks: repository.forks_count ?? 0,
    watchers: repository.watchers_count ?? repository.watchers ?? 0,
    openIssues: repository.open_issues_count ?? 0,
    updatedAt: repository.updated_at || null
  };
}

function splitByState(items) {
  return {
    open: items.filter(item => item?.state === 'open'),
    closed: items.filter(item => item?.state === 'closed')
  };
}

async function fetchRemoteDetails(repoInfo) {
  const tools = await mcpManager.listGitHubTools();
  const toolNames = new Set(tools.map(tool => tool.name));
  const tasks = [];

  if (toolNames.has('search_repositories')) {
    tasks.push(
      mcpManager.callGitHubTool('search_repositories', {
        query: `repo:${repoInfo.owner}/${repoInfo.repo}`,
        perPage: 5
      }).then(response => ({ key: 'repository', response }))
    );
  }

  if (toolNames.has('list_commits')) {
    tasks.push(
      mcpManager.callGitHubTool('list_commits', {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        per_page: 5
      }).then(response => ({ key: 'commits', response }))
    );
  }

  if (toolNames.has('list_issues') && toolNames.has('list_pull_requests')) {
    tasks.push(
      mcpManager.callGitHubTool('list_issues', {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        state: 'all',
        per_page: 20
      }).then(response => ({ key: 'issues', response }))
    );

    tasks.push(
      mcpManager.callGitHubTool('list_pull_requests', {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        state: 'all',
        per_page: 20
      }).then(response => ({ key: 'pullRequests', response }))
    );

    const responses = await Promise.all(tasks);
    const responseMap = Object.fromEntries(responses.map(item => [item.key, item.response]));
    const repository = getRepositorySummary(parseMcpPayload(responseMap.repository), repoInfo.owner, repoInfo.repo);
    const commits = normalizeCollection(parseMcpPayload(responseMap.commits)).slice(0, 5);
    const issues = normalizeCollection(parseMcpPayload(responseMap.issues)).filter(issue => !issue.pull_request);
    const pullRequests = normalizeCollection(parseMcpPayload(responseMap.pullRequests));

    return { repository, commits, issues, pullRequests, source: 'list' };
  }

  if (toolNames.has('search_issues')) {
    tasks.push(
      mcpManager.callGitHubTool('search_issues', {
        q: `repo:${repoInfo.owner}/${repoInfo.repo} is:issue`,
        per_page: 20
      }).then(response => ({ key: 'issues', response }))
    );

    tasks.push(
      mcpManager.callGitHubTool('search_issues', {
        q: `repo:${repoInfo.owner}/${repoInfo.repo} is:pr`,
        per_page: 20
      }).then(response => ({ key: 'pullRequests', response }))
    );

    const responses = await Promise.all(tasks);
    const responseMap = Object.fromEntries(responses.map(item => [item.key, item.response]));
    const repository = getRepositorySummary(parseMcpPayload(responseMap.repository), repoInfo.owner, repoInfo.repo);
    const commits = normalizeCollection(parseMcpPayload(responseMap.commits)).slice(0, 5);
    const issues = normalizeCollection(parseMcpPayload(responseMap.issues)).filter(issue => !issue.pull_request);
    const pullRequests = normalizeCollection(parseMcpPayload(responseMap.pullRequests));

    return { repository, commits, issues, pullRequests, source: 'search' };
  }

  throw new Error('No compatible GitHub MCP tools were found for issues or pull requests.');
}

export async function remoteStatusCommand() {
  const config = getConfig();

  if (!config.mcp.github.enabled) {
    console.log(chalk.yellow('⚠️  GitHub MCP is not enabled.'));
    console.log(chalk.dim('Enable it with "gitguide config" and ensure GITHUB_PERSONAL_ACCESS_TOKEN is set in your environment.'));
    return;
  }

  const repoInfo = getGitHubRepoInfo();
  if (!repoInfo) {
    console.log(chalk.red('❌ Could not determine GitHub repository owner and name from remote "origin".'));
    return;
  }

  const spinner = ora('Connecting to GitHub via MCP...').start();

  try {
    spinner.text = `Fetching data for ${repoInfo.owner}/${repoInfo.repo}...`;
    const { repository, commits, issues, pullRequests } = await fetchRemoteDetails(repoInfo);
    const issueStates = splitByState(issues);
    const pullRequestStates = splitByState(pullRequests);

    spinner.succeed('Successfully fetched remote status via MCP!\n');

    console.log(chalk.bold.blue(`📦 Repository: ${repoInfo.owner}/${repoInfo.repo}`));
    if (repository) {
      console.log(chalk.dim(`   ${repository.description}`));
      console.log(chalk.white(`   Visibility: `) + chalk.cyan(repository.visibility));
      console.log(chalk.white(`   Default branch: `) + chalk.cyan(repository.defaultBranch));
      console.log(chalk.white(`   Stars/Forks/Watchers: `) + chalk.cyan(`${repository.stars}/${repository.forks}/${repository.watchers}`));
      console.log(chalk.white(`   Open issues count: `) + chalk.cyan(String(repository.openIssues)));
      console.log(chalk.white(`   Last updated: `) + chalk.cyan(formatDate(repository.updatedAt)));
    }

    const currentBranch = getCurrentBranch();
    if (currentBranch) {
      console.log(chalk.white(`   Current branch: `) + chalk.cyan(currentBranch));
      console.log(chalk.white(`   Remote branch exists: `) + chalk.cyan(remoteBranchExists(currentBranch) ? 'yes' : 'no'));
    }

    console.log(chalk.bold.yellow('\n📊 Summary:'));
    console.log(`  ${formatCountLine('Open issues:', issueStates.open.length)}`);
    console.log(`  ${formatCountLine('Closed issues:', issueStates.closed.length)}`);
    console.log(`  ${formatCountLine('Open pull requests:', pullRequestStates.open.length)}`);
    console.log(`  ${formatCountLine('Closed pull requests:', pullRequestStates.closed.length)}`);

    console.log(chalk.bold.green('\n🐛 Open Issues:'));
    if (issueStates.open.length > 0) {
      issueStates.open.slice(0, 5).forEach(issue => console.log(formatIssueLine(issue)));
    } else {
      console.log(chalk.dim('  No open issues found.'));
    }

    console.log(chalk.bold.magenta('\n🔀 Open Pull Requests:'));
    if (pullRequestStates.open.length > 0) {
      pullRequestStates.open.slice(0, 5).forEach(pr => console.log(formatPullRequestLine(pr)));
    } else {
      console.log(chalk.dim('  No open pull requests found.'));
    }

    console.log(chalk.bold.gray('\n🕘 Recently Closed Issues:'));
    if (issueStates.closed.length > 0) {
      issueStates.closed.slice(0, 3).forEach(issue => console.log(formatIssueLine(issue)));
    } else {
      console.log(chalk.dim('  No recently closed issues found.'));
    }

    console.log(chalk.bold.blue('\n✅ Recently Closed Pull Requests:'));
    if (pullRequestStates.closed.length > 0) {
      pullRequestStates.closed.slice(0, 3).forEach(pr => console.log(formatPullRequestLine(pr)));
    } else {
      console.log(chalk.dim('  No recently closed pull requests found.'));
    }

    console.log(chalk.bold.cyan('\n🧾 Recent Commits:'));
    if (commits.length > 0) {
      commits.forEach(commit => console.log(formatCommitLine(commit)));
    } else {
      console.log(chalk.dim('  No recent commits found.'));
    }

    console.log('\n' + chalk.dim('Powered by @modelcontextprotocol/server-github'));

  } catch (error) {
    spinner.fail('MCP Connection Failed');
    console.error(chalk.red(error.message));
    console.log(chalk.dim('Tip: Verify that GitHub MCP is enabled, your token is valid, and your repository remote points to GitHub.'));
  }
}
