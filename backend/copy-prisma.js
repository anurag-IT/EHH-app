import fs from 'fs';
import path from 'path';

const src = path.join(process.cwd(), 'prisma');
const dest = path.join(process.cwd(), 'dist', 'prisma');

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(src)) {
    console.log(`Copying prisma folder to dist...`);
    copyRecursive(src, dest);
    console.log('Successfully copied prisma folder.');
} else {
    console.log('Prisma folder not found, skipping copy.');
}
