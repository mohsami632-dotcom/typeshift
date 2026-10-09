import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';

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
  beforeAll(() => {
    if (!fs.existsSync(cliPath)) {
      throw new Error(
        `CLI build artifact not found at "${cliPath}". Please run "pnpm run build" before running CLI integration tests.`,
      );
    }
  });
  it('runs --help with exit code 0', () => {
    const { stdout, code } = runCli('--help');
    expect(code).toBe(0);
    expect(stdout).toContain('Developer-first, CLI and programmatic schema compiler');
    expect(stdout).toContain('Commands:');
    expect(stdout).toContain('convert');
    expect(stdout).toContain('list');
    expect(stdout).toContain('validate');
  });

  it('runs --version and reports the package version', () => {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'),
    ) as { version: string };
    const { stdout, code } = runCli('--version');
    expect(code).toBe(0);
    expect(stdout.trim()).toBe(pkgJson.version);
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

  it('exits with code 2 on --loss-policy error when information loss is detected', () => {
    const fixturePath = path.resolve(__dirname, '../../fixtures/json-schema/user.json');
    const { code, stderr } = runCli(
      `convert "${fixturePath}" --to typescript --loss-policy error`,
      {
        expectError: true,
      },
    );
    expect(code).toBe(2);
    expect(stderr).toContain('Information loss was detected');
  });

  it('fails with clear error on unknown format', () => {
    const fixturePath = path.resolve(__dirname, '../../fixtures/typescript/user.ts');
    const { code, stderr } = runCli(`convert "${fixturePath}" --to nonexistent-format`, {
      expectError: true,
    });
    expect(code).toBe(1);
    expect(stderr).toContain('Unknown format: "nonexistent-format"');
  });

  it('correctly auto-detects .zod.ts compound extension', () => {
    const fixturePath = path.resolve(__dirname, '../../fixtures/zod/user.ts');
    // Test validation with explicit format
    const { stdout, code } = runCli(`validate "${fixturePath}" --format zod`);
    expect(code).toBe(0);
    expect(stdout).toContain('zod');
  });

  it('runs validate --json and outputs structured json', () => {
    const fixturePath = path.resolve(__dirname, '../../fixtures/typescript/user.ts');
    const { stdout, code } = runCli(`validate "${fixturePath}" --json`);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.valid).toBe(true);
    expect(parsed.format).toBe('typescript');
    expect(parsed.definitionsCount).toBeGreaterThanOrEqual(1);
  });

  it('supports format aliases (ts, jsonschema, z)', () => {
    const fixturePath = path.resolve(__dirname, '../../fixtures/typescript/user.ts');
    const { stdout, code } = runCli(`convert "${fixturePath}" --from ts --to jsonschema`);
    expect(code).toBe(0);
    expect(stdout).toContain('http://json-schema.org/draft-07/schema#');

    const zodRes = runCli(`convert "${fixturePath}" --to z`);
    expect(zodRes.code).toBe(0);
    expect(zodRes.stdout).toContain("import { z } from 'zod';");
  });

  it('fails gracefully on malformed JSON file', () => {
    const tmpBadJson = path.resolve(__dirname, '../../tmp-bad.json');
    fs.writeFileSync(tmpBadJson, '{ invalid json: [', 'utf8');
    try {
      const { code, stderr } = runCli(`convert "${tmpBadJson}" --to typescript`, {
        expectError: true,
      });
      expect(code).toBe(1);
      expect(stderr).toContain('Invalid JSON input');
    } finally {
      if (fs.existsSync(tmpBadJson)) fs.unlinkSync(tmpBadJson);
    }
  });

  it('fails convert on missing input file with clean exit code 1', () => {
    const { code, stderr } = runCli('convert non-existent-schema.json --to typescript', {
      expectError: true,
    });
    expect(code).toBe(1);
    expect(stderr).toContain('Input file not found');
  });

  it('converts OpenAPI 3.1 file to TypeScript via CLI with auto-detection', () => {
    const openapiPath = path.resolve(__dirname, '../../fixtures/openapi/petstore.openapi.json');
    const { stdout, code } = runCli(`convert "${openapiPath}" --to typescript`);
    expect(code).toBe(0);
    expect(stdout).toContain('export interface Pet');
    expect(stdout).toContain('export interface Category');
  });

  it('validates OpenAPI 3.1 file via CLI', () => {
    const openapiPath = path.resolve(__dirname, '../../fixtures/openapi/petstore.openapi.json');
    const { stdout, code } = runCli(`validate "${openapiPath}" --json`);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.valid).toBe(true);
    expect(parsed.format).toBe('openapi');
    expect(parsed.definitionsCount).toBeGreaterThanOrEqual(2);
  });

  it('gives clear guidance when given a YAML file', () => {
    const tmpYaml = path.resolve(__dirname, '../../test-temp.yaml');
    fs.writeFileSync(tmpYaml, 'openapi: 3.1.0\ninfo:\n  title: Test', 'utf8');
    try {
      const { code, stderr } = runCli(`convert "${tmpYaml}" --to typescript`, {
        expectError: true,
      });
      expect(code).toBe(1);
      expect(stderr).toContain('YAML format (.yaml/.yml) is not yet supported');
    } finally {
      if (fs.existsSync(tmpYaml)) fs.unlinkSync(tmpYaml);
    }
  });
});

