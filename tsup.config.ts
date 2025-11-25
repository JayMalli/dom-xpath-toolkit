import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    xpath: 'src/xpath/index.ts',
    selection: 'src/selection/index.ts',
    cli: 'src/cli/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'es2022',
  treeshake: true,
  platform: 'neutral',
  splitting: false,
  external: [
    'node:fs/promises',
    'node:process',
    'node:buffer',
    'node:url',
  ],
});
