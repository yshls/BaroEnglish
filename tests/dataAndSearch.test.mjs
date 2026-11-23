import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const ipaSymbols = JSON.parse(
  fs.readFileSync(path.join(root, 'src/data/ipaSymbols.json'), 'utf8')
);
const coreWords = JSON.parse(
  fs.readFileSync(path.join(root, 'src/data/coreWords.json'), 'utf8')
);

test('all example wordIds in ipaSymbols.json exist in coreWords.json', () => {
  const wordIdSet = new Set(coreWords.map((w) => w.id));
  for (const sym of ipaSymbols) {
    for (const ex of sym.examples) {
      if (ex.wordId) {
        assert.ok(
          wordIdSet.has(ex.wordId),
          `Symbol ${sym.id} example "${ex.word}" references missing wordId "${ex.wordId}"`
        );
      }
    }
  }
});

test('every multi-syllable word in coreWords.json has at least one primary stress syllable', () => {
  for (const word of coreWords) {
    const hasPrimary = word.syllables.some((s) => s.stress === 'primary');
    assert.ok(
      hasPrimary,
      `Word "${word.word}" (${word.id}) must have a primary stress syllable`
    );
  }
});

test('schwa words include sym_schwa in symbolIds for Tab 1 backtracking', () => {
  for (const word of coreWords) {
    const hasSchwaSyllable = word.syllables.some((s) => s.isSchwa === true);
    if (hasSchwaSyllable) {
      assert.ok(
        word.symbolIds.includes('sym_schwa'),
        `Word "${word.word}" has isSchwa syllable but lacks "sym_schwa" in symbolIds`
      );
    }
  }
});

test('English and Korean search finds expected core words', () => {
  const byEn = coreWords.filter((w) => w.word.toLowerCase().includes('ban'));
  const byKo = coreWords.filter((w) => w.meaningKo.includes('바나나'));
  assert.equal(byEn[0]?.id, 'word_banana');
  assert.equal(byKo[0]?.id, 'word_banana');
});

test('every word in coreWords.json maps cleanly to at least one symbol in ipaSymbols.json', () => {
  const symbolMap = new Map(ipaSymbols.map((s) => [s.id, s]));
  for (const word of coreWords) {
    assert.ok(word.symbolIds.length > 0, `${word.id} must have symbolIds`);
    for (const sid of word.symbolIds) {
      assert.ok(symbolMap.has(sid), `${word.id} references unknown symbol ${sid}`);
    }
  }
});
