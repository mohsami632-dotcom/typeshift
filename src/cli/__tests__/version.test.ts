import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { getPackageVersion } from '../version';

describe('getPackageVersion', () => {
  it('returns the version defined in package.json', () => {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../../package.json'), 'utf8'),
    ) as { version: string };
    const version = getPackageVersion();
    expect(version).toBe(pkgJson.version);
  });
});
