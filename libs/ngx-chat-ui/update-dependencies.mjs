#!/usr/bin/env node
import { execSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import path from 'node:path';

async function getLatestVersion(libName, cwd) {
  const libVersionsStr = spawnSync(`git`, ['tag', '-l', `${libName}*`, '--sort', '-taggerdate'], {
    encoding: 'utf-8',
    stdio: 'pipe',
    cwd,
  }).stdout;
  return libVersionsStr.split('\n').at(0).replace(`${libName}-`, '');
}

const __file = new URL(import.meta.url).pathname;
const __dir = path.dirname(__file);

const packageJsonPath = path.resolve(__dir, 'package.json');
const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
const dependencies = Object.keys(packageJson.dependencies).filter((lib) =>
  lib.startsWith('@pazznetwork/')
);

for (let dependency of dependencies) {
  const libName = dependency.replace(/^@pazznetwork\//, '');
  const latestVersion = await getLatestVersion(libName, __dir);
  packageJson.dependencies[dependency] = `^${latestVersion}`;
}

await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

let hasChanged;
try {
  const output = execSync(`git diff --name-only -- ${packageJsonPath}`, {
    encoding: 'utf-8',
    stdio: 'pipe',
    cwd: __dir,
  });
  hasChanged = output.trim() !== '' && packageJsonPath.includes(output.trim());
} catch (error) {
  console.error(error);
  hasChanged = false;
}

if (hasChanged) {
  execSync(`git commit -m "chore(ngx-chat): update package dependencies" -- ${packageJsonPath}`, {
    encoding: 'utf-8',
    stdio: 'pipe',
    cwd: __dir,
  });
  console.info('Updated package dependencies to the latest versions.');
} else {
  console.info('No package dependencies were updated.');
}
