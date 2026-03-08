import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();
const ENV_EXAMPLE = path.join(ROOT_DIR, '.env.example');
const ENV_LOCAL = path.join(ROOT_DIR, '.env.local');
const BACKEND_ENV_EXAMPLE = path.join(ROOT_DIR, 'backend', '.env.example');
const BACKEND_ENV = path.join(ROOT_DIR, 'backend', '.env');

// Simple pattern to check for potential secrets in example files
const SECRET_PATTERNS = [
  /sk_live_[a-zA-Z0-9]+/,
  /key-[a-zA-Z0-9]{32}/,
  /AIza[0-9A-Za-z-_]{35}/, // Google API Key
  /xoxp-[0-9a-zA-Z]{12}-[0-9a-zA-Z]{12}-[0-9a-zA-Z]{12}-[0-9a-zA-Z]{32}/, // Slack
];

function validateExample(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      console.error(
        `\x1b[31mError: Potential secret detected in ${filePath} matching pattern ${pattern}\x1b[0m`
      );
      process.exit(1);
    }
  }
}

function syncEnv(examplePath, localPath) {
  validateExample(examplePath);
  if (!fs.existsSync(examplePath)) {
    console.warn(
      `\x1b[33mWarning: Example file not found: ${examplePath}\x1b[0m`
    );
    return;
  }

  if (!fs.existsSync(localPath)) {
    console.log(`\x1b[32mCreating ${localPath} from ${examplePath}...\x1b[0m`);
    fs.copyFileSync(examplePath, localPath);
    return;
  }

  const exampleContent = fs.readFileSync(examplePath, 'utf8');
  const localContent = fs.readFileSync(localPath, 'utf8');

  const exampleKeys = exampleContent
    .split('\n')
    .filter((line) => line.includes('=') && !line.startsWith('#'))
    .map((line) => line.split('=')[0].trim());

  const localKeys = localContent
    .split('\n')
    .filter((line) => line.includes('=') && !line.startsWith('#'))
    .map((line) => line.split('=')[0].trim());

  const missingKeys = exampleKeys.filter((key) => !localKeys.includes(key));

  if (missingKeys.length > 0) {
    console.log(
      `\x1b[32mAdding missing keys to ${localPath}: ${missingKeys.join(', ')}\x1b[0m`
    );
    let updatedContent = localContent;
    if (!updatedContent.endsWith('\n')) updatedContent += '\n';

    missingKeys.forEach((key) => {
      const line = exampleContent
        .split('\n')
        .find((l) => l.startsWith(`${key}=`));
      if (line) {
        updatedContent += `${line}\n`;
      }
    });

    fs.writeFileSync(localPath, updatedContent);
  } else {
    console.log(`\x1b[36m${localPath} is up to date.\x1b[0m`);
  }
}

console.log('Syncing environment variables...');
syncEnv(ENV_EXAMPLE, ENV_LOCAL);
syncEnv(BACKEND_ENV_EXAMPLE, BACKEND_ENV);
console.log('\x1b[32mEnvironment variable sync complete.\x1b[0m');
