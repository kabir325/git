import fs from 'fs';
import path from 'path';

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getGitGuideDir(projectDir = process.cwd()) {
  const dirPath = path.join(projectDir, '.gitguide');
  ensureDirectory(dirPath);
  return dirPath;
}

export function getLogsDir(projectDir = process.cwd()) {
  const dirPath = path.join(getGitGuideDir(projectDir), 'logs');
  ensureDirectory(dirPath);
  return dirPath;
}

function getExecutionLogsDir(projectDir = process.cwd()) {
  const dirPath = path.join(getLogsDir(projectDir), 'executions');
  ensureDirectory(dirPath);
  return dirPath;
}

function getPlansLogsDir(projectDir = process.cwd()) {
  const dirPath = path.join(getLogsDir(projectDir), 'plans');
  ensureDirectory(dirPath);
  return dirPath;
}

function getErrorsLogsDir(projectDir = process.cwd()) {
  const dirPath = path.join(getLogsDir(projectDir), 'errors');
  ensureDirectory(dirPath);
  return dirPath;
}

function createLogFileName(prefix) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const randomId = Math.random().toString(36).slice(2, 10);
  return `${timestamp}-${prefix}-${randomId}.json`;
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function writePlanLog(payload, projectDir = process.cwd()) {
  const filePath = path.join(getPlansLogsDir(projectDir), createLogFileName('plan'));
  writeJsonFile(filePath, payload);
  return filePath;
}

export function writeErrorLog(payload, projectDir = process.cwd()) {
  const filePath = path.join(getErrorsLogsDir(projectDir), createLogFileName('error'));
  writeJsonFile(filePath, payload);
  return filePath;
}

export function createExecutionSession(metadata = {}, projectDir = process.cwd()) {
  const id = createLogFileName('execution').replace(/\.json$/, '');
  const filePath = path.join(getExecutionLogsDir(projectDir), `${id}.json`);
  const session = {
    id,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'running',
    metadata,
    plan: [],
    riskSummary: null,
    snapshot: null,
    executedSteps: [],
    pendingSteps: [],
    failedStep: null,
    retryHistory: [],
    rollback: null,
    outcome: null
  };

  writeJsonFile(filePath, session);
  return { session, filePath };
}

export function saveExecutionSession(filePath, session) {
  session.updatedAt = new Date().toISOString();
  writeJsonFile(filePath, session);
}

export function readLatestExecutionSession(projectDir = process.cwd()) {
  const logsDir = getExecutionLogsDir(projectDir);
  const files = fs.readdirSync(logsDir)
    .filter(file => file.endsWith('.json'))
    .map(file => ({
      file,
      fullPath: path.join(logsDir, file),
      mtimeMs: fs.statSync(path.join(logsDir, file)).mtimeMs
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (files.length === 0) {
    return null;
  }

  const latestFile = files[0];
  return {
    filePath: latestFile.fullPath,
    session: JSON.parse(fs.readFileSync(latestFile.fullPath, 'utf8'))
  };
}
