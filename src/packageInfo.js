import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packagePath = path.join(__dirname, '..', 'package.json');

let cachedPackageInfo = null;

export function getPackageInfo() {
  if (!cachedPackageInfo) {
    cachedPackageInfo = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  }

  return cachedPackageInfo;
}

export function getPackageVersion() {
  return getPackageInfo().version;
}
