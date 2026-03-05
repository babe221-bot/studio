#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function detectFramework() {
    const root = process.cwd();
    
    // Check for JavaScript/TypeScript frameworks
    if (fs.existsSync(path.join(root, 'package.json'))) {
        const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        if (deps.jest) return 'jest';
        if (deps.vitest) return 'vitest';
        if (deps.mocha) return 'mocha';
        if (deps.cypress) return 'cypress';
    }

    // Check for Python
    if (fs.existsSync(path.join(root, 'requirements.txt')) || fs.existsSync(path.join(root, 'pyproject.toml'))) {
        const content = fs.existsSync(path.join(root, 'requirements.txt')) 
            ? fs.readFileSync(path.join(root, 'requirements.txt'), 'utf8')
            : fs.readFileSync(path.join(root, 'pyproject.toml'), 'utf8');
        
        if (content.includes('pytest')) return 'pytest';
        if (content.includes('unittest')) return 'unittest';
    }

    // Check for Rust
    if (fs.existsSync(path.join(root, 'Cargo.toml'))) return 'cargo-test';

    return 'unknown';
}

console.log(detectFramework());
