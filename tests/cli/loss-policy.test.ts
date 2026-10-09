import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';

const cliPath = path.resolve(__dirname, '../../dist/cli.js');
const tmpDir = path.resolve(__dirname, '../../tmp-loss-test');

function runCli(args: string[]) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    code: result.status ?? 0,
  };
}

describe('CLI: Loss Policy & Exit Codes', () => {
  const richSchemaPath = path.join(tmpDir, 'rich.json');
  const cleanSchemaPath = path.join(tmpDir, 'clean.json');

  beforeAll(() => {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    fs.writeFileSync(
      richSchemaPath,
      JSON.stringify({
        $schema: 'http://json-schema.org/draft-07/schema#',
        title: 'User',
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          age: { type: 'integer', minimum: 18 },
        },
        required: ['email'],
      }),
      'utf8',
    );

    fs.writeFileSync(
      cleanSchemaPath,
      JSON.stringify({
        $schema: 'http://json-schema.org/draft-07/schema#',
        title: 'User',
        type: 'object',
        properties: {
          email: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['email'],
      }),
      'utf8',
    );
  });

  afterAll(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('exits with code 2 on --loss-policy error when information loss is detected', () => {
    const outPath = path.join(tmpDir, 'should-not-exist.ts');
    const { code, stderr } = runCli([
      'convert',
      richSchemaPath,
      '--to',
      'typescript',
      '--loss-policy',
      'error',
      '-o',
      outPath,
    ]);

    expect(code).toBe(2);
    expect(stderr).toContain('Information-Loss Diagnostics');
    expect(stderr).toContain('Constraint "format" (value: "email") will be dropped');
    expect(stderr).toContain('Constraint "minimum" (value: 18) will be dropped');
    expect(stderr).toContain('Aborting due to --loss-policy error.');
    expect(fs.existsSync(outPath)).toBe(false);
  });

  it('exits with code 0 on --loss-policy error when zero loss exists', () => {
    const outPath = path.join(tmpDir, 'clean-out.ts');
    const { code, stderr } = runCli([
      'convert',
      cleanSchemaPath,
      '--to',
      'typescript',
      '--loss-policy',
      'error',
      '-o',
      outPath,
    ]);

    expect(code).toBe(0);
    expect(stderr).not.toContain('Information-Loss Diagnostics');
    expect(fs.existsSync(outPath)).toBe(true);
    const generated = fs.readFileSync(outPath, 'utf8');
    expect(generated).toContain('export interface User {');
    expect(generated).toContain('email: string;');
    expect(generated).toContain('age?: number;');
  });

  it('exits with code 0 on default --loss-policy warn while reporting diagnostics to stderr', () => {
    const outPath = path.join(tmpDir, 'warn-out.ts');
    const { code, stderr } = runCli([
      'convert',
      richSchemaPath,
      '--to',
      'typescript',
      '-o',
      outPath,
    ]);

    expect(code).toBe(0);
    expect(stderr).toContain('Information-Loss Diagnostics');
    expect(stderr).toContain('Successfully converted json-schema → typescript');
    expect(fs.existsSync(outPath)).toBe(true);
  });

  it('exits with code 0 on --loss-policy ignore with silent stderr diagnostics', () => {
    const outPath = path.join(tmpDir, 'ignore-out.ts');
    const { code, stderr } = runCli([
      'convert',
      richSchemaPath,
      '--to',
      'typescript',
      '--loss-policy',
      'ignore',
      '-o',
      outPath,
    ]);

    expect(code).toBe(0);
    expect(stderr).not.toContain('Information-Loss Diagnostics');
    expect(fs.existsSync(outPath)).toBe(true);
  });
});
