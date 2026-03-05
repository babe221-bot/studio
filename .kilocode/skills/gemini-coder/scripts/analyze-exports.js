#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];

if (!filePath || !fs.existsSync(filePath)) {
    console.error('Error: File path not provided or does not exist.');
    process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');

const exportsFound = [];

// Match common JS/TS export patterns
const patterns = [
    /export (const|function|class|let|var) (\w+)/g,
    /export {([^}]+)}/g,
    /export default (\w+)?/g,
    /module\.exports\s*=\s*\{([^}]+)\}/g,
    /module\.exports\s*=\s*(\w+)/g
];

patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
        if (match[2]) {
            exportsFound.push(match[2]);
        } else if (match[1]) {
            const list = match[1].split(',').map(s => s.trim().split(' as ')[0]);
            exportsFound.push(...list);
        } else if (match[0].includes('default')) {
            exportsFound.push('default');
        }
    }
});

console.log(JSON.stringify([...new Set(exportsFound)], null, 2));
