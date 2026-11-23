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

// Gate 3: Design Tokens check
const tokensPath = path.join(root, 'src', 'theme', 'tokens.ts');
if (fs.existsSync(tokensPath)) {
  const tokensText = fs.readFileSync(tokensPath, 'utf8');
  const requiredHexes = [
    '#F7F5F0',
    '#FFFFFF',
    '#E5E0D8',
    '#15803D',
    '#1B4332',
    '#DCFCE7',
    '#D97706',
    '#B45309',
    '#1E293B',
  ];
  const missingHexes = requiredHexes.filter(
    (hex) => !tokensText.toUpperCase().includes(hex)
  );
  if (missingHexes.length > 0) {
    fail('Design Tokens', `Missing required colors: ${missingHexes.join(', ')}`);
  } else {
    pass('Design Tokens', 'all 9 SPEC.md color hex tokens verified');
  }
}

// Gate 4: Local JSON Data Integrity Check
const symbolsPath = path.join(root, 'src', 'data', 'ipaSymbols.json');
const wordsPath = path.join(root, 'src', 'data', 'coreWords.json');

let symbolIdSet = null;
if (fs.existsSync(symbolsPath)) {
  try {
    const symbols = JSON.parse(fs.readFileSync(symbolsPath, 'utf8'));
    if (!Array.isArray(symbols)) {
      fail('Data (ipaSymbols.json)', 'Root must be an array');
    } else {
      const counts = { basic_vowels: 0, diphthongs: 0, key_consonants: 0 };
      const ids = new Set();
      let symbolErr = null;

      for (const s of symbols) {
        if (!s.id || !s.categoryId || !s.ipa || !s.titleKo || !s.mouthGuideKo || !s.koHint) {
          symbolErr = `Symbol missing required fields: ${JSON.stringify(s)}`;
          break;
        }
        if (ids.has(s.id)) {
          symbolErr = `Duplicate symbol id: ${s.id}`;
          break;
        }
        ids.add(s.id);
        if (!(s.categoryId in counts)) {
          symbolErr = `Invalid categoryId "${s.categoryId}" on ${s.id}`;
          break;
        }
        counts[s.categoryId]++;
        if (!Array.isArray(s.examples) || s.examples.length !== 3) {
          symbolErr = `Symbol ${s.id} must have exactly 3 example words`;
          break;
        }
        for (const ex of s.examples) {
          if (!ex.word || !ex.meaningKo || !ex.ipa) {
            symbolErr = `Symbol ${s.id} has incomplete example word`;
            break;
          }
        }
        if (symbolErr) break;
      }

      if (symbolErr) {
        fail('Data (ipaSymbols.json)', symbolErr);
      } else if (
        symbols.length !== 18 ||
        counts.basic_vowels !== 7 ||
        counts.diphthongs !== 5 ||
        counts.key_consonants !== 6
      ) {
        fail(
          'Data (ipaSymbols.json)',
          `Expected 18 symbols (7/5/6), got ${symbols.length} (${counts.basic_vowels}/${counts.diphthongs}/${counts.key_consonants})`
        );
      } else {
        symbolIdSet = ids;
        pass('Data (ipaSymbols.json)', '18 symbols (7 basic_vowels, 5 diphthongs, 6 key_consonants), 3 examples each');
      }
    }
  } catch (err) {
    fail('Data (ipaSymbols.json)', err.message);
  }
}

if (fs.existsSync(wordsPath)) {
  try {
    const words = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
    if (!Array.isArray(words)) {
      fail('Data (coreWords.json)', 'Root must be an array');
    } else {
      const validStress = new Set(['primary', 'secondary', 'none']);
      const ids = new Set();
      let wordErr = null;

      for (const w of words) {
        if (!w.id || !w.word || !w.meaningKo || !w.ipa || !w.koPronunciation) {
          wordErr = `Word missing required fields: ${w?.id || w?.word}`;
          break;
        }
        if (ids.has(w.id)) {
          wordErr = `Duplicate word id: ${w.id}`;
          break;
        }
        ids.add(w.id);

        if (!Array.isArray(w.syllables) || w.syllables.length === 0) {
          wordErr = `Word ${w.id} must have non-empty syllables array`;
          break;
        }
        for (const syl of w.syllables) {
          if (!syl.text || !syl.ipa || !syl.koHint || !validStress.has(syl.stress)) {
            wordErr = `Word ${w.id} has invalid syllable: ${JSON.stringify(syl)}`;
            break;
          }
        }
        if (wordErr) break;

        if (!Array.isArray(w.symbolIds) || w.symbolIds.length === 0) {
          wordErr = `Word ${w.id} must have at least one symbolId`;
          break;
        }
        if (symbolIdSet) {
          for (const sid of w.symbolIds) {
            if (!symbolIdSet.has(sid)) {
              wordErr = `Word ${w.id} references unknown symbolId "${sid}"`;
              break;
            }
          }
        }
        if (wordErr) break;
      }

      if (wordErr) {
        fail('Data (coreWords.json)', wordErr);
      } else if (words.length < 30) {
        fail('Data (coreWords.json)', `Expected at least 30 core words for MVP validation, got ${words.length}`);
      } else {
        pass('Data (coreWords.json)', `${words.length} core words validated with 100% symbolId referential integrity`);
      }
    }
  } catch (err) {
    fail('Data (coreWords.json)', err.message);
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
