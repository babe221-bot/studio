import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();
const ENV_EXAMPLE = path.join(ROOT_DIR, '.env.example');
const ENV_LOCAL = path.join(ROOT_DIR, '.env.local');
const BACKEND_ENV_EXAMPLE = path.join(ROOT_DIR, 'backend', '.env.example');
const BACKEND_ENV = path.join(ROOT_DIR, 'backend', '.env');

function syncEnv(examplePath, localPath) {
  if (!fs.existsSync(examplePath)) {
    console.warn(`Example file not found: ${examplePath}`);
    return;
  }

  if (!fs.existsSync(localPath)) {
    console.log(`Creating ${localPath} from ${examplePath}...`);
    fs.copyFileSync(examplePath, localPath);
    return;
  }

  const exampleContent = fs.readFileSync(examplePath, 'utf8');
  const localContent = fs.readFileSync(localPath, 'utf8');

  const exampleKeys = exampleContent
    .split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => line.split('=')[0].trim());

  const localKeys = localContent
    .split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => line.split('=')[0].trim());

  const missingKeys = exampleKeys.filter(key => !localKeys.includes(key));

  if (missingKeys.length > 0) {
    console.log(`Adding missing keys to ${localPath}: ${missingKeys.join(', ')}`);
    let updatedContent = localContent;
    if (!updatedContent.endsWith('\n')) updatedContent += '\n';
    
    missingKeys.forEach(key => {
      const line = exampleContent.split('\n').find(l => l.startsWith(`${key}=`));
      if (line) {
        updatedContent += `${line}\n`;
      }
    });
    
    fs.writeFileSync(localPath, updatedContent);
  } else {
    console.log(`${localPath} is up to date.`);
  }
}

console.log('Syncing environment variables...');
syncEnv(ENV_EXAMPLE, ENV_LOCAL);
syncEnv(BACKEND_ENV_EXAMPLE, BACKEND_ENV);
console.log('Environment variable sync complete.');
