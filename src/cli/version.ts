import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

declare const __CLI_VERSION__: string | undefined;

/**
 * Resolves the CLI version dynamically from package metadata.
 *
 * In compiled bundles, `__CLI_VERSION__` is injected by tsup from package.json.
 * In unbundled execution (tests, tsx), it reads package.json from the filesystem.
 */
export function getPackageVersion(): string {
  if (typeof __CLI_VERSION__ !== 'undefined' && __CLI_VERSION__) {
    return __CLI_VERSION__;
  }

  try {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const candidates = [
      resolve(currentDir, '../package.json'),
      resolve(currentDir, '../../package.json'),
    ];

    for (const candidate of candidates) {
      try {
        const content = readFileSync(candidate, 'utf8');
        const parsed = JSON.parse(content) as { version?: string };
        if (parsed.version) {
          return parsed.version;
        }
      } catch {
        // Try next candidate
      }
    }
  } catch {
    // Fallback if filesystem read fails
  }

  return '0.0.0';
}
