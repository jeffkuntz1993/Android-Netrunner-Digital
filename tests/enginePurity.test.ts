import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const CORE_DIR = path.resolve(__dirname, '../src/core');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

// Guards the architectural invariants in PROJECT_STATUS.md: the engine is
// headless and deterministic.
const FORBIDDEN: [RegExp, string][] = [
  [/Math\.random/, 'use the seeded RNG in src/core/rng.ts'],
  [/Date\.now|new Date\(/, 'the engine must not read the clock'],
  [/from ['"]react/, 'src/core must not import React'],
  [/\b(window|document|localStorage)\./, 'src/core must not touch browser globals'],
];

describe('Engine purity', () => {
  for (const file of sourceFiles(CORE_DIR)) {
    it(`${path.relative(CORE_DIR, file)} is headless and deterministic`, () => {
      const src = fs.readFileSync(file, 'utf8');
      for (const [pattern, why] of FORBIDDEN) {
        expect(pattern.test(src), `${pattern} found: ${why}`).toBe(false);
      }
    });
  }
});
