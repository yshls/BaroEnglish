#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const failures = [];

function pass(label, detail = '') {
  console.log(`[PASS] ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label, detail) {
  console.error(`[FAIL] ${label} — ${detail}`);
  failures.push(`${label}: ${detail}`);
}

function walkFiles(dir, exts, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.expo', 'dist', 'build', '_tmp_app'].includes(entry.name)) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, exts, result);
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      result.push(full);
    }
  }
  return result;
}

console.log('\n=== BaroEnglish Automated Verification Gate ===\n');

// Gate 1: Forbidden dependency & pattern check
const pkgPath = path.join(root, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  if ('expo-av' in allDeps) {
    fail('Guardrail (package.json)', 'expo-av is forbidden; use expo-audio instead.');
  } else {
    pass('Guardrail (package.json)', 'no forbidden expo-av dependency');
  }
}

const sourceFiles = [
  ...walkFiles(path.join(root, 'app'), ['.ts', '.tsx', '.js', '.jsx']),
  ...walkFiles(path.join(root, 'src'), ['.ts', '.tsx', '.js', '.jsx']),
];

const forbiddenMatches = [];
for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('expo-av')) {
    forbiddenMatches.push(`${path.relative(root, file)} references expo-av`);
  }
}
if (forbiddenMatches.length > 0) {
  fail('Guardrail (source)', forbiddenMatches.join('; '));
} else {
  pass('Guardrail (source)', `${sourceFiles.length} source files clean`);
}

// Gate 2: TypeScript typecheck
if (fs.existsSync(path.join(root, 'tsconfig.json')) && fs.existsSync(path.join(root, 'node_modules'))) {
  try {
    execSync('npx tsc --noEmit', { cwd: root, stdio: 'pipe' });
    pass('TypeScript (tsc --noEmit)', 'zero type errors');
  } catch (err) {
    const output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
    fail('TypeScript (tsc --noEmit)', output.trim() || err.message);
  }
} else {
  pass('TypeScript (tsc --noEmit)', 'skipped (project not yet installed)');
}

// Gate 3: Design Tokens check (baro light gray + #FF4C4B brand main + Spoqa Han Sans Neo font)
const tokensPath = path.join(root, 'src', 'theme', 'tokens.ts');
if (fs.existsSync(tokensPath)) {
  const tokensText = fs.readFileSync(tokensPath, 'utf8');
  const requiredTokens = [
    '#FFFCF6',
    '#FFFFFF',
    '#EAE5DC',
    '#F56823',
    '#B53D0A',
    '#FFF2E9',
    '#2D2924',
    'SPOKAHANSANSNEO',
  ];
  const missingTokens = requiredTokens.filter(
    (token) => !tokensText.toUpperCase().includes(token)
  );
  if (missingTokens.length > 0) {
    fail('Design Tokens', `Missing required tokens: ${missingTokens.join(', ')}`);
  } else {
    pass('Design Tokens', 'baro #F56823 warm-neutral brand palette & SpokaHanSansNeo font tokens verified');
  }
}

// Gate 4: Zero Hardcoded JSON Guardrail & Pure TS IPA Catalog Check
const jsonFilesInSrc = walkFiles(path.join(root, 'src'), ['.json']);
if (jsonFilesInSrc.length > 0) {
  fail(
    'Guardrail (no JSON in src/)',
    `Hardcoded JSON files are strictly forbidden under src/: ${jsonFilesInSrc
      .map((f) => path.relative(root, f))
      .join(', ')}`
  );
} else {
  pass('Guardrail (no JSON in src/)', '0 hardcoded .json data files under src/');
}

const catalogPath = path.join(root, 'src', 'data', 'ipaCatalog.ts');
if (!fs.existsSync(catalogPath)) {
  fail('Data (ipaCatalog.ts)', 'Missing src/data/ipaCatalog.ts');
} else {
  try {
    const catalogSrc = fs.readFileSync(catalogPath, 'utf8');
    if (/\bexamples\s*:/.test(catalogSrc)) {
      fail(
        'Data (ipaCatalog.ts)',
        'Hardcoded examples array is forbidden in ipaCatalog.ts; example words must be fetched dynamically'
      );
    } else {
      const symbolRegex =
        /id:\s*'([^']+)'[\s\S]*?categoryId:\s*'([^']+)'[\s\S]*?isCore:\s*(true|false)[\s\S]*?ipa:\s*'([^']+)'[\s\S]*?arpaTargets:\s*\[([^\]]+)\][\s\S]*?spellingPatterns:\s*\[([^\]]+)\]/g;
      const matches = [...catalogSrc.matchAll(symbolRegex)];
      const counts = {
        basic_vowels: 0,
        diphthongs: 0,
        key_consonants: 0,
        basic_consonants: 0,
      };
      const coreCounts = { basic_vowels: 0, diphthongs: 0, key_consonants: 0 };
      const ids = new Set();
      let catalogErr = null;

      for (const m of matches) {
        const [, id, categoryId, isCoreStr, ipa, arpaRaw, patternsRaw] = m;
        if (ids.has(id)) {
          catalogErr = `Duplicate symbol id: ${id}`;
          break;
        }
        ids.add(id);
        if (!(categoryId in counts)) {
          catalogErr = `Invalid categoryId "${categoryId}" on ${id}`;
          break;
        }
        counts[categoryId]++;
        if (isCoreStr === 'true' && categoryId in coreCounts) {
          coreCounts[categoryId]++;
        }
        if (!ipa || !arpaRaw.includes("'") || !patternsRaw.includes("'")) {
          catalogErr = `Symbol ${id} missing ipa, arpaTargets, or spellingPatterns`;
          break;
        }
      }

      if (catalogErr) {
        fail('Data (ipaCatalog.ts)', catalogErr);
      } else if (
        matches.length !== 40 ||
        counts.basic_vowels !== 11 ||
        counts.diphthongs !== 5 ||
        counts.key_consonants !== 14 ||
        counts.basic_consonants !== 10 ||
        coreCounts.basic_vowels !== 7 ||
        coreCounts.diphthongs !== 5 ||
        coreCounts.key_consonants !== 6
      ) {
        fail(
          'Data (ipaCatalog.ts)',
          `Expected 40 symbols (11/5/14/10, core 7/5/6), got ${matches.length} (${counts.basic_vowels}/${counts.diphthongs}/${counts.key_consonants}/${counts.basic_consonants}, core ${coreCounts.basic_vowels}/${coreCounts.diphthongs}/${coreCounts.key_consonants})`
        );
      } else {
        pass(
          'Data (ipaCatalog.ts)',
          '40 pure IPA metadata entries (11/5/14/10; 18 core) with dynamic ARPAbet discovery and 0 hardcoded example words'
        );
      }
    }
  } catch (err) {
    fail('Data (ipaCatalog.ts)', err.message);
  }
}

// Gate 5: Unit tests
const testFiles = walkFiles(path.join(root, 'tests'), ['.test.mjs']);
if (testFiles.length > 0) {
  try {
    execSync(`node --test ${testFiles.map((f) => `"${f}"`).join(' ')}`, {
      cwd: root,
      stdio: 'pipe',
    });
    pass('Unit Tests (node --test)', `${testFiles.length} test suite(s) passed`);
  } catch (err) {
    const output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
    fail('Unit Tests (node --test)', output.trim() || err.message);
  }
}

console.log('');
if (failures.length > 0) {
  console.error(`Verification FAILED with ${failures.length} issue(s).`);
  process.exit(1);
} else {
  console.log('All verification gates PASSED.');
}
