import fs from 'fs';
import path from 'path';

function patchFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Handle .map(), .filter(), .forEach(), .some()
    // Specifically looking for "variable =>" and replacing with "(variable: any) =>"
    content = content.replace(/(\w+)\s*=>/g, (match, p1) => {
        // Avoid replacing if it's already typed (has a colon)
        if (p1.includes(':') || match.includes('(')) return match;
        // Don't replace keywords like return, await, etc.
        if (['return', 'await', 'async', 'if', 'for', 'while'].includes(p1)) return match;
        return `(${p1}: any) =>`;
    });

    // Handle (a, b) =>
    content = content.replace(/\(([^:]+),\s*([^:]+)\)\s*=>/g, (match, p1, p2) => {
        return `(${p1}: any, ${p2}: any) =>`;
    });

    // Handle catch(err)
    content = content.replace(/catch\s*\(([^:]+)\)/g, (match, p1) => {
        if (p1.includes(':')) return match;
        return `catch (${p1}: any)`;
    });

    fs.writeFileSync(filePath, content);
    console.log(`Patched: ${filePath}`);
}

const servicesDir = './backend/src/services';
fs.readdirSync(servicesDir).forEach(file => {
    if (file.endsWith('.ts')) {
        patchFile(path.join(servicesDir, file));
    }
});

patchFile('./backend/server.ts');
