import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import * as path from 'node:path';

const cliPath = path.resolve(__dirname, '../../dist/cli.js');

function runCli(args: string, options?: { expectError?: boolean }) {
  try {
    const stdout = execSync(`node "${cliPath}" ${args}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, code: 0 };
  } catch (err: unknown) {
    if (options?.expectError) {
      const execErr = err as { stdout?: string; stderr?: string; status?: number };
      return {
        stdout: execErr.stdout ?? '',
        stderr: execErr.stderr ?? '',
        code: execErr.status ?? 1,
      };
    }
    throw err;
  }
}

describe('CLI Integration', () => {
  it('runs --help with exit code 0', () => {
    const { stdout, code } = runCli('--help');
    expect(code).toBe(0);
    expect(stdout).toContain('Developer-first, CLI and programmatic schema compiler');
    expect(stdout).toContain('Commands:');
    expect(stdout).toContain('convert');
    expect(stdout).toContain('list');
    expect(stdout).toContain('validate');
  });

  it('runs list command with detailed view and json', () => {
    const { stdout } = runCli('list --detailed');
    expect(stdout).toContain('Available Schema Formats:');
    expect(stdout).toContain('typescript');
    expect(stdout).toContain('json-schema');
    expect(stdout).toContain('zod');

    const jsonRes = runCli('list --json');
    const formats = JSON.parse(jsonRes.stdout);
    expect(Array.isArray(formats)).toBe(true);
    expect(formats.some((f: { id: string }) => f.id === 'typescript')).toBe(true);
  });

  it('runs validate on existing fixture files', () => {
    const fixturePath = path.resolve(__dirname, '../../fixtures/typescript/user.ts');
    const { stdout, code } = runCli(`validate "${fixturePath}"`);
    expect(code).toBe(0);
    expect(stdout).toContain('Valid Schema:');
    expect(stdout).toContain('typescript');
  });

  it('fails validate on non-existent file', () => {
    const { code, stderr } = runCli('validate non-existent.ts', { expectError: true });
    expect(code).not.toBe(0);
    expect(stderr).toContain('File not found');
  });

  it('converts fixture via CLI', () => {
    const fixturePath = path.resolve(__dirname, '../../fixtures/typescript/user.ts');
    const { stdout, code } = runCli(`convert "${fixturePath}" --to json-schema`);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.$schema).toBeDefined();
    expect(parsed.$defs.User).toBeDefined();
  });
});
