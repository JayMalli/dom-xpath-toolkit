#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function main() {
  const pkgPath = resolve(process.cwd(), 'package.json');
  const raw = await readFile(pkgPath, 'utf-8');
  const pkg = JSON.parse(raw);
  const contact = pkg.bugs?.url ?? 'https://github.com/yourname/dom-xpath-toolkit/issues';
  const supported = pkg.version ?? '0.0.0';

  const report = {
    name: pkg.name,
    version: pkg.version,
    securityContact: contact,
    supportedVersions: [`>=${supported}`],
    scripts: {
      audit: pkg.scripts?.audit,
      securityTest: pkg.scripts?.['security:test'],
    },
    guidance: 'Run "npm run security:test" before publishing. Report issues via the contact URL.',
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
