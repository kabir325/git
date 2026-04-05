# 🎥 Building GitGuide: An AI-Powered Local Git CLI from Scratch

Welcome to the ultimate guide for your YouTube video! This document is structured as a step-by-step tutorial script and project walkthrough. It covers exactly how we built **GitGuide** from an empty folder into a production-grade, AI-powered CLI tool using Node.js, Ollama, and the Model Context Protocol (MCP).

---

## 📌 Video Outline & Timestamps
- **00:00** - Intro & Demo (Showcasing what GitGuide does)
- **02:15** - Project Setup & Architecture
- **04:30** - Building the CLI Foundation (Commander.js)
- **07:00** - Connecting Local AI (Ollama & DeepSeek-Coder)
- **11:20** - The Safety Layer & Execution Engine
- **15:00** - Creating the Interactive Dashboard (GitGraph & HTML)
- **19:30** - Adding GitHub MCP Integration
- **23:00** - Outro & How to Contribute

---

## 🎬 Step 1: Project Setup & Initialization

**Talking Point:** "We're building a fully local AI pair programmer for Git. No cloud APIs, complete privacy, using Ollama. Let's initialize our Node.js project."

**Actions:**
1. Create the folder and initialize npm:
   ```bash
   mkdir gitguide
   cd gitguide
   npm init -y
   ```
2. Open `package.json` and add `"type": "module"` to use ES6 imports.
3. Install the core dependencies:
   ```bash
   npm install commander inquirer chalk ora open boxen cli-table3 date-fns dotenv @modelcontextprotocol/sdk
   ```
4. Update `package.json` to make it a global CLI tool by adding the `bin` field:
   ```json
   "bin": {
     "gitguide": "./bin/gitguide.js"
   }
   ```

---

## 🎬 Step 2: The CLI Entry Point

**Talking Point:** "We need a way for the terminal to recognize our `gitguide` command. We'll set up a `bin` file and use Commander.js to route our commands."

**Files to Show/Write:**
1. **`bin/gitguide.js`**:
   - The entry point. Must start with `#!/usr/bin/env node`.
   - Imports and executes the main CLI logic.

2. **`src/cli.js`**:
   - Here we initialize `commander`.
   - We define our commands: `do`, `commit`, `push`, `suggest`, `explain`, `visualize`, `init`, and `remote-status`.
   - *B-Roll Idea:* Show the terminal running `gitguide --help` and seeing the beautifully formatted command list.

---

## 🎬 Step 3: Gathering Repository Context

**Talking Point:** "Before the AI can help us, it needs to know what's happening in our code. We'll build a Context Engine using native child processes to read Git states."

**Files to Show/Write:**
1. **`src/repoContext.js`**:
   - Use Node's `child_process.execSync`.
   - Write functions to fetch `git status`, `git diff` (staged and unstaged), and `git branch`.
   - *Key takeaway for viewers:* The AI is only as smart as the context you feed it!

---

## 🎬 Step 4: The AI Planning Engine (Ollama Streaming)

**Talking Point:** "This is the brain of the operation. We are connecting to a local Ollama instance running `deepseek-coder`. To make it feel blazing fast, we're going to stream the response chunk-by-chunk."

**Files to Show/Write:**
1. **`src/planningEngine.js`**:
   - Build the `callOllama` function using the native `fetch` API.
   - **Crucial trick:** Enforce `format: 'json'` in the Ollama API payload so the AI doesn't break our parser with conversational text.
   - Implement the streaming reader: `response.body.getReader()`.
   - Write the system prompt: Instruct the AI to act as a strict execution engine returning a JSON array of commands.

---

## 🎬 Step 5: The Safety Layer & Execution Engine

**Talking Point:** "AI can hallucinate, and running `rm -rf` by accident is a nightmare. We need a Safety Layer to intercept the AI's plan and ask the human for permission."

**Files to Show/Write:**
1. **`src/safetyLayer.js`**:
   - Use `inquirer` to display the AI's JSON plan.
   - Prompt the user: `Proceed? (y/n/edit)`.
2. **`src/executionEngine.js`**:
   - If the user says "yes", loop through the plan.
   - Use `execSync` to run each command sequentially.
   - Add a `try/catch` block: If a Git command fails, catch the error and ask the AI for an immediate fix.

---

## 🎬 Step 6: The Interactive Visualization Dashboard

**Talking Point:** "Terminal output can get messy. What if we could generate a beautiful, interactive 2D graph of our Git history in the browser natively from our CLI?"

**Files to Show/Write:**
1. **`src/commands/visualize.js`**:
   - Fetch the raw Git logs using `git log --pretty=format`.
   - Instead of trying to render complex ASCII in the terminal, generate a `graph.html` file on the fly.
   - Inject `@gitgraph/js` via a CDN into the HTML file.
   - Write the topological sorting algorithm: Map branches to commits, ensuring parent-child relationships are drawn correctly.
   - Use the `open` package (with a Windows `start` fallback) to automatically pop open the browser.

---

## 🎬 Step 7: The Setup Wizard & GitHub MCP Integration

**Talking Point:** "To make this a true production tool, we need an initialization wizard and integration with the Model Context Protocol (MCP) so our AI can read GitHub issues directly."

**Files to Show/Write:**
1. **`src/commands/init.js`**:
   - Use `inquirer` to ask the user for their GitHub URL and Personal Access Token.
   - Save this to a local `.env` file and generate a `.gitguide.config.json` file.
   - *Pro-tip for viewers:* Always automatically add `.env` to `.gitignore` programmatically so users don't leak tokens!
2. **`src/mcpManager.js`**:
   - Import `@modelcontextprotocol/sdk`.
   - Connect to the local GitHub MCP server using `StdioClientTransport`.
   - Fetch issues and PRs so the AI knows what tickets the developer is working on.

---

## 🚀 Wrapping Up the Video

**Talking Point / Outro:**
"And that is how you build a fully local, AI-powered Git CLI from scratch. We combined Node.js child processes, local LLMs via Ollama, HTML canvas visualizations, and the new Model Context Protocol. The code is open-source and linked in the description. Hit subscribe for more deep-dive engineering tutorials!"

---

### 💡 Extra YouTube Tips for this Video:
- **Screen Recording:** When showing the `visualize` command, make sure to record the exact moment the terminal command finishes and the browser smoothly pops open. It’s a great "wow" moment.
- **Visual Aids:** Briefly show the `ARCHITECTURE.md` Mermaid diagram on screen when explaining how the modules (CLI -> Context -> AI -> Safety -> Execution) talk to each other.
- **B-Roll:** Show Ollama running in a separate terminal tab so viewers understand the AI is truly running locally on your machine.
