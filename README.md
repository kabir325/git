# GitGuide 🧭

**An AI-powered Execution Engine for Git Operations**

---

## 🛑 Problem Statement

Version control systems, specifically Git, are fundamental to modern software engineering. However, Git's steep learning curve, obscure syntax, and complex mental models often act as a barrier to entry for junior developers and a source of friction for senior engineers. Developers frequently find themselves context-switching out of their IDE to search for the correct sequence of Git commands to achieve a specific outcome—whether it's untangling a messy rebase, initializing a repository with a new remote, or generating meaningful conventional commit messages.

Existing tools generally fall into two categories: static graphical user interfaces (GUIs) that hide Git's power behind buttons, or AI chatbots that only provide text suggestions that the developer must manually copy, paste, and execute. There is a critical gap for a tool that natively understands natural language intent, safely translates it into an actionable Git execution plan, and autonomously executes those commands directly within the local terminal environment while providing robust visual feedback.

---

## 📖 Abstract

**GitGuide** is a production-grade, locally hosted Command Line Interface (CLI) tool designed to revolutionize how developers interact with version control. By bridging the gap between natural language intent and deterministic Git execution, GitGuide acts as an autonomous, intelligent pair programmer for repository management.

Unlike traditional AI coding assistants that rely on cloud-based APIs and act strictly as conversational agents, GitGuide is an *execution engine*. It leverages local Large Language Models (LLMs) via Ollama (specifically tuned models like `deepseek-coder`) to ensure complete data privacy and zero latency. When a user inputs a natural language command—such as "initialize an empty repo and push it to my github link"—GitGuide's Repo Context Builder dynamically gathers the current state of the repository (branches, diffs, commits, and remotes). This rich context is fed into the AI Planning Engine, which synthesizes a strict, deterministic JSON execution plan, streaming the thought process back to the user in real-time.

Safety is a core tenet of GitGuide's architecture. Before any destructive or state-altering commands are run, the tool intercepts the workflow using an interactive Safety Layer. This layer visualizes the proposed execution plan, allowing the developer to review, edit, or cancel individual steps. Once approved, the Execution Engine sequentially runs the commands, gracefully trapping errors and autonomously querying the AI for immediate fix suggestions if a command fails.

Beyond natural language execution, GitGuide provides a suite of intelligent utilities. It can auto-generate conventional commit messages by analyzing staged diffs, explain the precise impact of complex commands (like `git rebase`) before they are executed, and proactively suggest logical next steps based on the repository's current state. Furthermore, GitGuide includes a powerful `visualize` command that generates a stunning, interactive 2D HTML/Canvas dashboard in the browser, offering developers a clear, topological network graph of their commit history and branch architecture.

GitGuide also features an opt-in **Model Context Protocol (MCP)** integration. By seamlessly connecting to remote servers (like GitHub), GitGuide's AI can read open issues and pull requests directly from the terminal, making it a comprehensive, end-to-end repository management tool. By combining local AI planning with deterministic execution, interactive configuration, and beautiful visualizations, GitGuide dramatically lowers the cognitive load of version control, allowing developers to focus on writing code rather than wrestling with Git syntax.

---

## 🏗️ System Architecture

The tool is divided into modular components:
1. **CLI Layer:** Built with `commander.js`, parsing commands and routing them to handlers.
2. **Repo Context Builder:** Synchronously gathers Git telemetry (`git status`, `git diff`, branch info) to provide the AI with situational awareness.
3. **MCP Client Manager (Opt-in):** Connects to GitHub via the Model Context Protocol to fetch live repository issues and pull requests.
4. **Planning Engine:** Interfaces with local Ollama APIs, enforcing strict JSON schemas to prevent hallucinations and generate actionable plans. Features real-time response streaming.
5. **Safety Layer:** Uses `inquirer.js` to visualize the plan and force user confirmation or modification before execution.
6. **Execution Engine:** Runs the generated Git commands sequentially, trapping errors and suggesting AI-driven fixes on the fly.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed topological diagram.

---

## 🚀 Installation

GitGuide is designed to be installed globally on your machine.

### Prerequisites
* **Node.js** (v16+)
* **Git** installed and available in your PATH
* **Ollama** installed and running locally (`http://localhost:11434`)
* **Ollama Model:** Pull the required model by running:
  ```bash
  ollama run deepseek-coder
  ```

### Setup

1. Clone or download this repository.
2. Navigate to the project directory:
   ```bash
   cd gitguide
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Link the package globally:
   ```bash
   npm link
   ```

---

## 🛠️ Getting Started & Configuration

Once installed, you can initialize GitGuide in any local repository. Just like `npm init`, GitGuide features an interactive setup process to configure remote URLs and opt-in to advanced MCP features.

Navigate to your repository and run:
```bash
gitguide init
```
This command will:
1. Check if you have a remote origin set (and prompt you to add one if you don't).
2. Ask if you want to enable **GitHub MCP Integration**.
3. If enabled, prompt you for a GitHub Personal Access Token, saving it securely to a local `.env` file and creating a `.gitguide.config.json` file.

---

## 💻 Core Commands

### 1. Natural Language Execution
Tell GitGuide what you want to do in plain English. It will stream a plan, ask for your permission, and execute the commands.
```bash
gitguide do "create a branch called feature/auth, add my files, and commit them as 'add login UI'"
```

### 2. Remote Status (MCP Integration)
If you opted into MCP during `gitguide init`, you can fetch live data from GitHub directly into your terminal.
```bash
gitguide remote-status
```
*Outputs a list of open issues and pull requests for your current repository.*

### 3. Smart Commits
Generate conventional commit messages automatically based on your staged `git diff`.
```bash
gitguide commit
```

### 4. Safe Push
Analyze the impact of a push before actually pushing. GitGuide runs a dry-run and explains exactly what will happen to the remote.
```bash
gitguide push
```

### 5. Command Explanation
Not sure what a command will do? Ask GitGuide to explain it in the context of your current repository state.
```bash
gitguide explain "git rebase main"
```

### 6. AI Suggestions
Ask the AI what you should do next based on your uncommitted files and branch status.
```bash
gitguide suggest
```

### 7. Beautiful Visualization Dashboard
Generate an interactive, full-screen, 2D topological network graph of your repository's history directly in your web browser.
```bash
gitguide visualize
```

---

## 🛡️ Privacy & Open Source
GitGuide is an open-source tool designed with privacy first. By default, it runs **100% locally**. Your source code, commit history, and diffs never leave your machine unless you explicitly opt-in to the GitHub MCP integration. All AI generation is handled by your local Ollama instance.
