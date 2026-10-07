import { defineConfig } from 'tsup';

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
  },
]);
