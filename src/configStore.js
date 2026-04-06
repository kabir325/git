import fs from 'fs';
import path from 'path';

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getProjectGitGuideDir(projectDir = process.cwd()) {
  const dirPath = path.join(projectDir, '.gitguide');
  ensureDirectory(dirPath);
  return dirPath;
}

export function getProjectConfigPath(projectDir = process.cwd()) {
  return path.join(getProjectGitGuideDir(projectDir), 'config.json');
}

export function getLegacyConfigPath(projectDir = process.cwd()) {
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
  const legacyConfigPath = getLegacyConfigPath(projectDir);

  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      return {};
    }
  }

  if (fs.existsSync(legacyConfigPath)) {
    try {
      const legacyConfig = JSON.parse(fs.readFileSync(legacyConfigPath, 'utf8'));
      writeProjectConfig(legacyConfig, projectDir);
      return legacyConfig;
    } catch {
      return {};
    }
  }

  return {};
}

export function writeProjectConfig(config, projectDir = process.cwd()) {
  ensureDirectory(getProjectGitGuideDir(projectDir));
  const configPath = getProjectConfigPath(projectDir);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function updateProjectConfig(updater, projectDir = process.cwd()) {
  const currentConfig = readProjectConfig(projectDir);
  const nextConfig = updater(currentConfig);
  writeProjectConfig(nextConfig, projectDir);
  return nextConfig;
}

export function setGitHubMcpEnabled(enabled, projectDir = process.cwd()) {
  return updateProjectConfig(config => ({
    ...config,
    mcp: {
      ...(config.mcp || {}),
      github: {
        ...((config.mcp && config.mcp.github) || {}),
        enabled
      }
    }
  }), projectDir);
}

export function setAutoExecuteEnabled(enabled, projectDir = process.cwd()) {
  return updateProjectConfig(config => ({
    ...config,
    execution: {
      ...(config.execution || {}),
      autoExecute: enabled
    }
  }), projectDir);
}

export function setDefaultBranch(defaultBranch, projectDir = process.cwd()) {
  return updateProjectConfig(config => ({
    ...config,
    defaultBranch
  }), projectDir);
}

export function setPreferredModel(preferredModel, projectDir = process.cwd()) {
  return updateProjectConfig(config => ({
    ...config,
    preferredModel
  }), projectDir);
}

export function setSafetyLevel(safetyLevel, projectDir = process.cwd()) {
  return updateProjectConfig(config => ({
    ...config,
    safetyLevel
  }), projectDir);
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
