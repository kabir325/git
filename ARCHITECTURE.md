# GitGuide System Architecture

The following diagram outlines the internal architecture of **GitGuide**, illustrating how the local CLI interacts with the deterministic Git Execution Engine, the local AI (Ollama), and the new **opt-in Model Context Protocol (MCP)** integration for tracking remote tools like GitHub and Jira.

## Architecture Diagram

```mermaid
graph TD
    %% Define styles
    classDef cli fill:#4a90e2,stroke:#1e40af,stroke-width:2px,color:white;
    classDef core fill:#10b981,stroke:#047857,stroke-width:2px,color:white;
    classDef ai fill:#8b5cf6,stroke:#581c87,stroke-width:2px,color:white;
    classDef external fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:white;
    classDef mcp fill:#ec4899,stroke:#9d174d,stroke-width:2px,color:white;

    %% Nodes
    User((User)) -->|CLI Commands| CLI[CLI Layer]
    CLI:::cli

    %% Core Components
    CLI -->|Fetches Telemetry| RCB[Repo Context Builder]
    RCB:::core
    RCB -->|Reads Git State| LocalGit[(Local Git Repo)]
    LocalGit:::external

    %% MCP Opt-In Integration
    subgraph MCP [Opt-In Integrations MCP]
        RCB -.->|If Enabled via Config| MCP_Manager[MCP Client Manager]
        MCP_Manager:::mcp
        
        MCP_Manager -.->|stdio| MCP_GitHub[GitHub MCP Server]
        MCP_GitHub:::external
        MCP_GitHub -.->|API| GitHubCloud[(GitHub APIs: PRs, Issues)]
        GitHubCloud:::external

        MCP_Manager -.->|stdio Future| MCP_Jira[Jira MCP Server]
        MCP_Jira:::external
        MCP_Jira -.->|API| JiraCloud[(Jira APIs)]
        JiraCloud:::external
    end

    %% AI Pipeline
    CLI -->|Instruction + Context| PE[Planning Engine]
    PE:::core
    RCB -->|Injects State| PE
    MCP_Manager -.->|Injects Remote Context| PE
    
    PE -->|Prompt / Streaming| Ollama[(Local Ollama Model)]
    Ollama:::ai
    
    %% Execution Pipeline
    PE -->|Deterministic JSON Plan| SL[Safety Layer]
    SL:::core
    SL -->|Prompts for Confirmation| User
    SL -->|Approved Plan| EE[Execution Engine]
    EE:::core
    EE -->|Executes Commands| LocalGit
    EE -.->|Traps Error & Retries| PE
```

## Module Breakdown

1. **CLI Layer**: The entry point built with `commander.js`. Routes user requests (`do`, `visualize`, `remote-status`, etc.).
2. **Repo Context Builder**: Synchronously gathers local Git state (branches, diffs, staged files).
3. **MCP Client Manager (Opt-in)**: A dynamically loaded wrapper around `@modelcontextprotocol/sdk`. If configured by the user, it launches local npx MCP servers (like `@modelcontextprotocol/server-github`) to fetch remote context such as open issues or pull requests. It fails gracefully if the user opts out.
4. **Planning Engine**: Interfaces securely with local `Ollama` to synthesize the context and the user's intent into a strict JSON execution plan. Now supports real-time streaming.
5. **Safety Layer**: Visualizes the AI's plan via `inquirer.js` to ensure destructive commands are reviewed.
6. **Execution Engine**: Deterministically executes the JSON plan step-by-step against the local Git binary.
