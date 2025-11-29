import { spawn } from 'node:child_process';
import { rm, mkdir, cp, writeFile, access, readFile } from 'node:fs/promises';
import path from 'node:path';

const npmCommand = 'npm';

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

async function fileExists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function ensurePlaygroundPackage(playgroundRoot) {
  const pkgPath = path.join(playgroundRoot, 'package.json');
  if (await fileExists(pkgPath)) {
    return;
  }
  const pkg = {
    name: 'dom-xpath-toolkit-playground',
    private: true,
    version: '0.0.0',
    license: 'MIT',
  };
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2));
}

async function unlinkLocalPackage(playgroundRoot) {
  try {
    await run(npmCommand, ['unlink', 'dom-xpath-toolkit'], { cwd: playgroundRoot });
  } catch (error) {
    console.warn('[playground] No local link to remove (safe to ignore).');
    if (process.env.DEBUG_PLAYGROUND_UNLINK) {
      console.warn(error.message);
    }
  }
}

async function installPublishedPackage(playgroundRoot) {
  await run(npmCommand, ['install', 'dom-xpath-toolkit@latest'], { cwd: playgroundRoot });
}

async function rewriteImportMap(indexPath, replacementPath) {
  let html = await readFile(indexPath, 'utf8');
  const needle = './node_modules/dom-xpath-toolkit/dist/index.js';
  if (!html.includes(needle)) {
    console.warn('[playground] expected import map entry missing; leaving file untouched.');
    return;
  }
  html = html.replace(needle, replacementPath);
  await writeFile(indexPath, html);
}

async function copyToolkitBundle(playgroundRoot, outputDir) {
  const vendorDir = path.join(outputDir, 'vendor');
  await mkdir(vendorDir, { recursive: true });
  const toolkitSource = path.join(playgroundRoot, 'node_modules', 'dom-xpath-toolkit', 'dist', 'index.js');
  const toolkitTarget = path.join(vendorDir, 'dom-xpath-toolkit.js');
  await cp(toolkitSource, toolkitTarget);
  return path.relative(outputDir, toolkitTarget).replace(/\\/g, '/');
}

async function buildStaticBundle(playgroundRoot, publishDir) {
  const outputDir = publishDir;
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const assetsToCopy = ['index.html', 'app.js', 'styles.css', 'logo-light.svg', 'icon-light.svg'];
  for (const asset of assetsToCopy) {
    const source = path.join(playgroundRoot, asset);
    if (await fileExists(source)) {
      await cp(source, path.join(outputDir, asset));
    }
  }

  const fixturesPath = path.join(playgroundRoot, 'fixtures');
  if (await fileExists(fixturesPath)) {
    await cp(fixturesPath, path.join(outputDir, 'fixtures'), { recursive: true });
  }

  const vendorPath = await copyToolkitBundle(playgroundRoot, outputDir);
  await rewriteImportMap(path.join(outputDir, 'index.html'), `./${vendorPath}`);
}

async function main() {
  const repoRoot = path.resolve('.', '.');
  const playgroundRoot = path.join(repoRoot, 'examples', 'playground');
  const publishRoot = path.join(repoRoot, 'docs', 'playground');

  await ensurePlaygroundPackage(playgroundRoot);
  await unlinkLocalPackage(playgroundRoot);
  await installPublishedPackage(playgroundRoot);
  await buildStaticBundle(playgroundRoot, publishRoot);

  console.log('Playground assets ready at docs/playground (serve via GitHub Pages).');
}

main().catch((error) => {
  console.error('Failed to build playground for GitHub Pages:', error);
  process.exitCode = 1;
});
