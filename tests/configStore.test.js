import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  getProjectConfigPath,
  readProjectConfig,
  setAutoExecuteEnabled,
  setDefaultBranch,
  setPreferredModel,
  setSafetyLevel
} from '../src/configStore.js';

function createTempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'gitguide-test-'));
}

test('configStore writes config to .gitguide/config.json', () => {
  const projectDir = createTempProject();

  setAutoExecuteEnabled(true, projectDir);
  setDefaultBranch('dev', projectDir);
  setPreferredModel('phi3', projectDir);
  setSafetyLevel('strict', projectDir);

  const configPath = getProjectConfigPath(projectDir);
  const config = readProjectConfig(projectDir);

  assert.equal(fs.existsSync(configPath), true);
  assert.equal(config.execution.autoExecute, true);
  assert.equal(config.defaultBranch, 'dev');
  assert.equal(config.preferredModel, 'phi3');
  assert.equal(config.safetyLevel, 'strict');
});
