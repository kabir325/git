import fs from 'fs';
import path from 'path';

export function getProjectConfigPath(projectDir = process.cwd()) {
  return path.join(projectDir, '.gitguide.config.json');
}

export function getProjectEnvPath(projectDir = process.cwd()) {
  return path.join(projectDir, '.env');
}

export function getProjectGitignorePath(projectDir = process.cwd()) {
  return path.join(projectDir, '.gitignore');
}

export function readProjectConfig(projectDir = process.cwd()) {
  const configPath = getProjectConfigPath(projectDir);

  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
}

export function writeProjectConfig(config, projectDir = process.cwd()) {
  const configPath = getProjectConfigPath(projectDir);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function setGitHubMcpEnabled(enabled, projectDir = process.cwd()) {
  const config = readProjectConfig(projectDir);
  const nextConfig = {
    ...config,
    mcp: {
      ...(config.mcp || {}),
      github: {
        ...((config.mcp && config.mcp.github) || {}),
        enabled
      }
    }
  };

  writeProjectConfig(nextConfig, projectDir);
  return nextConfig;
}

export function setAutoExecuteEnabled(enabled, projectDir = process.cwd()) {
  const config = readProjectConfig(projectDir);
  const nextConfig = {
    ...config,
    execution: {
      ...(config.execution || {}),
      autoExecute: enabled
    }
  };

  writeProjectConfig(nextConfig, projectDir);
  return nextConfig;
}

export function readEnvFile(projectDir = process.cwd()) {
  const envPath = getProjectEnvPath(projectDir);

  if (!fs.existsSync(envPath)) {
    return '';
  }

  return fs.readFileSync(envPath, 'utf8');
}

export function writeEnvFile(content, projectDir = process.cwd()) {
  const envPath = getProjectEnvPath(projectDir);
  const normalized = content.trim();
  fs.writeFileSync(envPath, normalized ? `${normalized}\n` : '');
}

export function upsertEnvVar(key, value, projectDir = process.cwd()) {
  const currentContent = readEnvFile(projectDir);
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  const nextContent = pattern.test(currentContent)
    ? currentContent.replace(pattern, `${key}=${value}`)
    : [currentContent.trim(), `${key}=${value}`].filter(Boolean).join('\n');

  writeEnvFile(nextContent, projectDir);
}

export function removeEnvVar(key, projectDir = process.cwd()) {
  const currentContent = readEnvFile(projectDir);
  const lines = currentContent
    .split(/\r?\n/)
    .filter(line => line.trim() && !line.startsWith(`${key}=`));

  writeEnvFile(lines.join('\n'), projectDir);
}

export function ensureGitignoreEntry(entry, projectDir = process.cwd()) {
  const gitignorePath = getProjectGitignorePath(projectDir);

  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, `${entry}\n`);
    return;
  }

  const content = fs.readFileSync(gitignorePath, 'utf8');
  const entries = new Set(content.split(/\r?\n/).map(line => line.trim()).filter(Boolean));

  if (entries.has(entry)) {
    return;
  }

  const nextContent = `${content.trimEnd()}\n${entry}\n`;
  fs.writeFileSync(gitignorePath, nextContent);
}
