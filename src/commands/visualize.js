import { execSync, exec } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export async function visualizeCommand() {
  const spinner = ora('Fetching remote updates...').start();

  try {
    // Check if git is initialized
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });

    // Fetch all remote branches quietly so they show up in the graph
    try {
      execSync('git fetch --all --quiet', { stdio: 'ignore' });
    } catch (e) {
      // Ignore if no remote exists or offline
    }

    spinner.text = 'Analyzing git history...';

    // Fetch raw git log data
    const logOutput = execSync('git log --pretty=format:"%H|%P|%an|%ar|%D|%s" --date=iso --all', { stdio: 'pipe' }).toString().trim();
    
    if (!logOutput) {
      spinner.succeed('Git repository found.');
      console.log(chalk.yellow('\nNo commits found in this repository yet.\n'));
      return;
    }

    // Fetch branch data
    const branchOutput = execSync('git branch -a -vv', { stdio: 'pipe' }).toString().trim();
    const branchLines = branchOutput.split('\n').filter(l => l.trim().length > 0);
    
    const branchesData = branchLines.map(line => {
      // Example line: "* main          123abcd [origin/main: ahead 1] commit message"
      const isCurrent = line.startsWith('*');
      line = line.replace('*', '').trim();
      
      const parts = line.split(/ +/);
      let name = parts[0];
      
      // If it's a remote tracking branch, strip the 'remotes/' prefix if it exists
      if (name.startsWith('remotes/')) {
        name = name.replace('remotes/', '');
      }

      const hash = parts[1];
      
      // Extract upstream and ahead/behind info if present
      let upstream = '';
      let status = '';
      let message = parts.slice(2).join(' ');
      
      const upstreamMatch = message.match(/^\[(.*?)\] /);
      if (upstreamMatch) {
        const upstreamFull = upstreamMatch[1];
        if (upstreamFull.includes(':')) {
          const split = upstreamFull.split(':');
          upstream = split[0].trim();
          status = split[1].trim();
        } else {
          upstream = upstreamFull;
          status = 'up to date';
        }
        message = message.replace(/^\[.*?\] /, '');
      }

      return {
        name,
        isCurrent,
        hash,
        upstream: upstream || '-',
        status: status || '-',
        message
      };
    });

    // Parse commits
    const commits = logOutput.split('\n').map(line => {
      const [hash, parents, author, timeAgo, refs, subject] = line.split('|');
      return { 
        hash: hash.substring(0, 7), 
        parents: parents ? parents.split(' ').map(p => p.substring(0, 7)) : [], 
        author, 
        timeAgo, 
        refs: refs || '', 
        subject 
      };
    });

    spinner.text = 'Generating interactive HTML dashboard...';

    // Build the commits table rows
    const tableRows = commits.map(c => {
      let badges = '';
      if (c.refs) {
        badges = c.refs.split(', ').map(r => {
          r = r.trim();
          let colorClass = 'badge-green';
          if (r.includes('HEAD')) colorClass = 'badge-blue';
          else if (r.includes('origin/')) colorClass = 'badge-red';
          return `<span class="badge ${colorClass}">${r}</span>`;
        }).join(' ');
      }

      return `
        <tr>
          <td class="hash">${c.hash}</td>
          <td>${c.subject}</td>
          <td class="author">${c.author}</td>
          <td class="time">${c.timeAgo}</td>
          <td>${badges}</td>
        </tr>
      `;
    }).join('');

    // Build the branches table rows
    const branchTableRows = branchesData.map(b => {
      const currentIndicator = b.isCurrent ? '<span class="badge badge-blue">HEAD</span>' : '';
      const nameColor = b.name.includes('origin/') ? 'color: #ef4444;' : 'color: #22c55e; font-weight: bold;';
      return `
        <tr style="${b.isCurrent ? 'background-color: #1e293b;' : ''}">
          <td style="${nameColor}">${b.name} ${currentIndicator}</td>
          <td class="hash">${b.hash}</td>
          <td style="color: #b6c2cf;">${b.upstream}</td>
          <td style="color: ${b.status.includes('ahead') ? '#22c55e' : (b.status.includes('behind') ? '#ef4444' : '#858585')};">${b.status}</td>
          <td style="color: #e6edf3;">${b.message}</td>
        </tr>
      `;
    }).join('');

    // Gitgraph JS import is sometimes extremely strict about full topology.
    // Instead of relying on `import()`, we will manually build the tree but carefully 
    // track branch tips so branching and merging look completely accurate.
    const graphCommits = commits.slice().reverse(); // Oldest to newest

    // Generate HTML with Gitgraph.js and Table
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GitGuide - Visual Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/@gitgraph/js"></script>
  <style>
    :root {
      --text: #e6edf3;
      --muted: #b6c2cf;
      --bg: #0f172a;
      --card: #1f2937;
      --border: #334155;
    }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 30px;
    }
    h1 {
      color: #ffffff;
      margin-bottom: 0;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    }
    .container {
      display: flex;
      flex-direction: column;
      gap: 30px;
      max-width: 1200px;
      width: 100%;
    }
    .card {
      background: var(--card);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      border: 1px solid var(--border);
      width: 100%;
      box-sizing: border-box;
    }
    #graph-wrapper {
      background-color: #1e293b; 
      display: flex;
      justify-content: flex-start;
      overflow-x: auto;
      min-height: 400px;
    }
    #graph-container {
      width: 100%;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th, td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
    }
    th {
      color: #ffffff;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 13px;
      letter-spacing: 0.5px;
    }
    td {
      color: var(--text);
      font-weight: 500;
    }
    tr:hover td {
      background-color: #334155;
    }
    .hash {
      color: #7dd3fc; 
      font-family: monospace;
      font-weight: 600;
      font-size: 14px;
    }
    .author {
      color: #c084fc; 
      font-weight: 600;
    }
    .time {
      color: var(--muted);
      font-size: 13px;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 700;
      margin-right: 4px;
      margin-bottom: 4px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    .badge-blue { background-color: #3b82f6; color: #ffffff; }
    .badge-red { background-color: #ef4444; color: #ffffff; }
    .badge-green { background-color: #22c55e; color: #ffffff; }
    h2 {
      color: #fff;
      margin-top: 0;
      font-size: 18px;
      border-bottom: 1px solid #334155;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <h1>GitGuide Visual Dashboard</h1>
  
  <div class="container">
    <!-- Graphical Network View -->
    <div class="card" id="graph-wrapper">
      <div id="graph-container"></div>
    </div>

    <!-- Tabular Data View -->
    <div class="card" id="table-wrapper">
      <h2>Commit History</h2>
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>Commit</th>
              <th>Message</th>
              <th>Author</th>
              <th>Time</th>
              <th>Refs</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Branches Table View -->
    <div class="card" id="branches-wrapper">
      <h2>Branches Overview</h2>
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr>
              <th>Branch Name</th>
              <th>Latest Commit</th>
              <th>Upstream</th>
              <th>Status</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            ${branchTableRows}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    const graphContainer = document.getElementById("graph-container");
    const gitgraph = GitgraphJS.createGitgraph(graphContainer, {
      template: GitgraphJS.templateExtend("metro", {
        colors: ["#2196F3", "#E91E63", "#4CAF50", "#FF9800", "#9C27B0", "#00BCD4"],
        commit: {
          message: { displayAuthor: false, displayHash: true, color: "#ffffff", font: "14px sans-serif" },
          dot: { size: 10, strokeWidth: 2, strokeColor: "#ffffff" }
        },
        branch: { lineWidth: 3, label: { font: "12px sans-serif", color: "#ffffff", strokeColor: "rgba(0,0,0,0)" } }
      }),
      orientation: "vertical-reverse",
      generateCommitHash: () => { return ''; } // Prevents random hash generation
    });

    const graphCommits = ${JSON.stringify(graphCommits)};
    const branchRefs = {}; // maps branch names to their branch objects
    const commitRefs = {}; // maps commit hashes to the branch object that holds them

    // Master/main is our root
    let mainBranchName = 'master';
    let rootBranch = gitgraph.branch(mainBranchName);
    branchRefs[mainBranchName] = rootBranch;

    graphCommits.forEach(c => {
      // 1. Determine which branch this commit should be placed on.
      let targetBranch = null;

      // Extract explicit branch tags from refs if available
      let explicitBranchName = null;
      if (c.refs) {
        const refsArray = c.refs.split(',').map(r => r.trim());
        const bRef = refsArray.find(r => !r.includes('HEAD') && !r.includes('tag: '));
        if (bRef) {
          explicitBranchName = bRef.replace('origin/', '');
        }
      }

      // If we have an explicit branch, let's make sure it exists
      if (explicitBranchName && !branchRefs[explicitBranchName]) {
        // Find the branch object of its first parent
        const parentHash = c.parents[0];
        const parentBranch = commitRefs[parentHash] || rootBranch;
        
        branchRefs[explicitBranchName] = parentBranch.branch({
          name: explicitBranchName,
          style: { label: { color: '#ffffff', strokeColor: 'rgba(0,0,0,0)' } }
        });
      }

      // 2. Resolve Target Branch
      if (explicitBranchName) {
        targetBranch = branchRefs[explicitBranchName];
      } else {
        // It doesn't have an explicit branch ref on this exact commit.
        // It belongs to the branch of its first parent.
        const parentHash = c.parents[0];
        targetBranch = commitRefs[parentHash] || rootBranch;
      }

      // 3. Commit Options
      const commitOptions = {
        subject: c.subject,
        hash: c.hash,
        dotText: c.refs ? '📌' : '',
        style: {
          message: { color: '#ffffff' },
          dot: { font: "12px sans-serif", color: "#ffffff" }
        }
      };

      // 4. Perform Commit or Merge
      if (c.parents.length > 1) {
        // It's a merge commit! We need to merge parent 2 into targetBranch (parent 1).
        const mergedHash = c.parents[1];
        const branchToMerge = commitRefs[mergedHash];

        if (branchToMerge) {
          targetBranch.merge({
            branch: branchToMerge,
            commitOptions: { ...commitOptions, style: { dot: { color: '#00ff7f' } } }
          });
        } else {
          // Fallback if branch missing
          targetBranch.commit({ ...commitOptions, style: { dot: { color: '#00ff7f' } } });
        }
      } else {
        // Standard commit
        targetBranch.commit(commitOptions);
      }

      // Save reference so future children know where to attach
      commitRefs[c.hash] = targetBranch;
    });
    
  </script>
</body>
</html>
    `;

    // Save HTML to a temporary file
    const tmpDir = path.join(process.cwd(), '.gitguide');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    const htmlPath = path.join(tmpDir, 'graph.html');
    fs.writeFileSync(htmlPath, htmlContent);

    spinner.succeed('Interactive dashboard generated!');
    console.log(chalk.cyan(`\nOpening your dashboard in the browser...`));

    // Fallback manual open for Windows if 'open' library fails
    const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;
    
    if (process.platform === 'win32') {
      exec(`start "" "${htmlPath}"`);
    } else if (process.platform === 'darwin') {
      exec(`open "${htmlPath}"`);
    } else {
      exec(`xdg-open "${htmlPath}"`);
    }

    console.log(chalk.dim(`If it doesn't open automatically, click here: ${fileUrl}\n`));

  } catch (error) {
    if (spinner.isSpinning) spinner.fail('Failed to visualize repository.');
    if (error.message.includes('not a git repository')) {
      console.log(chalk.red('Error: The current directory is not a git repository. Run "git init" first.'));
    } else {
      console.error(chalk.red(error.message));
    }
  }
}
