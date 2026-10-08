import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };

export default defineConfig([
  // Library build — public programmatic API
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    clean: true,
    target: 'node20',
    outDir: 'dist',
  },
  // CLI build — binary entry point
  {
    entry: { cli: 'src/cli/index.ts' },
    format: ['esm'],
    splitting: false,
    clean: false,
    target: 'node20',
    outDir: 'dist',
    banner: { js: '#!/usr/bin/env node' },
    define: {
      __CLI_VERSION__: JSON.stringify(pkg.version),
    },
  },
]);
