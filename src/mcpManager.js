import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { getConfig } from "./config.js";
import { getPackageVersion } from "./packageInfo.js";

class MCPManager {
  constructor() {
    this.githubClient = null;
    this.jiraClient = null; // Reserved for future
  }

  async initializeGitHub() {
    const config = getConfig();
    if (!config.mcp.github.enabled) {
      return null;
    }

    if (!config.mcp.github.token) {
      throw new Error("GitHub MCP is enabled but GITHUB_PERSONAL_ACCESS_TOKEN is missing.");
    }

    if (this.githubClient) {
      return this.githubClient;
    }

    try {
      // Create transport pointing to the official GitHub MCP server
      // npx -y @modelcontextprotocol/server-github
      const transport = new StdioClientTransport({
        command: "npx.cmd", // Using npx.cmd for Windows compatibility
        args: ["-y", "@modelcontextprotocol/server-github"],
        env: {
          ...process.env,
          GITHUB_PERSONAL_ACCESS_TOKEN: config.mcp.github.token,
        },
      });

      const client = new Client(
        { name: "GitGuide", version: getPackageVersion() },
        { capabilities: { tools: {}, resources: {} } }
      );

      await client.connect(transport);
      this.githubClient = client;
      
      return client;
    } catch (error) {
      console.error("Failed to initialize GitHub MCP Server:", error.message);
      return null;
    }
  }

  /**
   * Helper function to execute an MCP tool on the GitHub server.
   */
  async callGitHubTool(toolName, args = {}) {
    const client = await this.initializeGitHub();
    if (!client) {
      return null; // Opted out or failed
    }

    try {
      const response = await client.callTool({
        name: toolName,
        arguments: args
      });
      return response;
    } catch (error) {
      console.error(`MCP Tool Error [${toolName}]:`, error.message);
      throw error;
    }
  }

  async listGitHubTools() {
    const client = await this.initializeGitHub();
    if (!client) {
      return [];
    }

    try {
      const response = await client.listTools();
      return response?.tools || [];
    } catch (error) {
      console.error("Failed to list GitHub MCP tools:", error.message);
      return [];
    }
  }
}

export const mcpManager = new MCPManager();
