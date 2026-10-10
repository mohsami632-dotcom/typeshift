#!/usr/bin/env node

/**
 * typeshift — Genuine Terminal Demo Runner
 * 
 * Runs a timed 45-second live terminal demonstration using the published
 * @mohsami/typeshift package and committed repository examples.
 * 
 * Sequence:
 * 1. Title banner and one-sentence explanation
 * 2. Format discovery: list --detailed
 * 3. Bidirectional conversion: TypeScript -> JSON Schema
 * 4. Information-loss detection: JSON Schema -> TypeScript with dropped constraints
 * 5. CI quality gate enforcement: --loss-policy error (exit code 2)
 * 6. Repository and installation details
 */

import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');

// Terminal color codes
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function typeWriter(text, delayMs = 18) {
  for (const ch of text) {
    process.stdout.write(ch);
    await sleep(delayMs);
  }
}

// Find appropriate runner for current directory:
// If run from inside typeshift repo, npm exec/npx tries to look in local node_modules/.bin.
// Using pnpm dlx or node dist/cli.js or npx with TEMP prefix ensures it works seamlessly.
function getCliRunner() {
  const distCli = resolve(REPO_ROOT, 'dist/cli.js');
  // Check if pnpm is available
  try {
    const pnpmCheck = spawnSync('pnpm --version', { encoding: 'utf8', shell: true });
    if (pnpmCheck.status === 0) {
      return {
        display: 'pnpm dlx @mohsami/typeshift@0.2.0',
        exec: 'pnpm',
        args: ['dlx', '@mohsami/typeshift@0.2.0'],
      };
    }
  } catch {
    // fallback
  }

  if (existsSync(distCli)) {
    return {
      display: 'node dist/cli.js',
      exec: process.execPath,
      args: [distCli],
    };
  }

  return {
    display: 'npx --yes @mohsami/typeshift@0.2.0',
    exec: 'npx',
    args: ['--yes', '@mohsami/typeshift@0.2.0'],
  };
}

async function runStep(stepNumber, description, cliCommand, extraArgs = []) {
  console.log(`\n${BOLD}${BLUE}── [Step ${stepNumber}/4] ${description} ──${RESET}`);
  await sleep(300);

  const runner = getCliRunner();
  const displayCmd = `${runner.display} ${cliCommand} ${extraArgs.join(' ')}`.trim();

  process.stdout.write(`${GREEN}❯ ${RESET}${BOLD}`);
  await typeWriter(displayCmd, 15);
  process.stdout.write(`${RESET}\n\n`);
  await sleep(400);

  const fullArgs = [...runner.args, ...cliCommand.split(' ').filter(Boolean), ...extraArgs];
  const commandLine = `${runner.exec} ${fullArgs.join(' ')}`;
  const proc = spawnSync(commandLine, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    shell: true,
  });

  if (proc.stdout) {
    // Filter out pnpm dlx progress / telemetry logs so output stays pristine
    const cleanStdout = proc.stdout
      .split('\n')
      .filter((line) => !line.includes('Progress: resolved') && !line.includes('Packages are copied') && !line.includes('Done in ') && !line.includes('dependencies:'))
      .join('\n')
      .trim();
    if (cleanStdout) console.log(cleanStdout);
  }

  if (proc.stderr) {
    const cleanStderr = proc.stderr
      .split('\n')
      .filter((line) => !line.includes('Progress: resolved') && !line.includes('Packages are copied') && !line.includes('Done in '))
      .join('\n')
      .trim();
    if (cleanStderr) console.error(cleanStderr);
  }

  if (proc.status !== 0) {
    console.log(`${YELLOW}⚡ Process exit code: ${proc.status}${RESET}`);
  }

  await sleep(1500);
}

async function main() {
  console.clear();
  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  typeshift v0.2.0 — Schema Compiler Demo${RESET}`);
  console.log(`${DIM}  Bidirectional, loss-aware conversion between TS, JSON Schema, Zod & OpenAPI${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);
  await sleep(1200);

  // Step 1: Inspect formats and declared capabilities
  await runStep(
    1,
    'Discover registered schema adapters and capability matrix',
    'list --detailed'
  );

  // Step 2: Convert TypeScript to Draft-07 JSON Schema
  await runStep(
    2,
    'Compile TypeScript interface to JSON Schema (Draft-07)',
    'convert examples/01-typescript-to-json-schema/user.ts --to json-schema'
  );

  // Step 3: Convert JSON Schema to TypeScript — Surfaces Information-Loss
  await runStep(
    3,
    'Information-Loss Diagnostics: Rich JSON Schema -> Compile-time TypeScript',
    'convert examples/03-json-schema-to-typescript/account.json --to typescript'
  );

  // Step 4: Strict loss enforcement in CI — exits with code 2
  await runStep(
    4,
    'Strict CI Quality Gate: Abort build if unrepresentable constraints are dropped',
    'convert examples/05-loss-policy-enforcement/schema-with-constraints.json --to typescript --loss-policy error'
  );

  console.log(`\n${BOLD}${GREEN}======================================================================${RESET}`);
  console.log(`${BOLD}${GREEN}  Demo Complete!${RESET}`);
  console.log(`${BOLD}  GitHub:${RESET}   https://github.com/mohsami632-dotcom/typeshift`);
  console.log(`${BOLD}  npm:${RESET}      https://www.npmjs.com/package/@mohsami/typeshift`);
  console.log(`${BOLD}  Try it:${RESET}   npx @mohsami/typeshift list --detailed`);
  console.log(`${BOLD}${GREEN}======================================================================${RESET}\n`);
}

main().catch(console.error);
