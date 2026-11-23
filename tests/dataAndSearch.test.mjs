import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const ipaSymbols = JSON.parse(
  fs.readFileSync(path.join(root, 'src/data/ipaSymbols.json'), 'utf8')
);

test('ipaSymbols.json has 18 symbols across 3 fixed categories with 3 examples each', () => {
  assert.equal(ipaSymbols.length, 18);
  const byCategory = { basic_vowels: 0, diphthongs: 0, key_consonants: 0 };
  for (const sym of ipaSymbols) {
    byCategory[sym.categoryId] += 1;
    assert.equal(sym.examples.length, 3, `${sym.id} must have 3 examples`);
  }
  assert.deepEqual(byCategory, {
    basic_vowels: 7,
    diphthongs: 5,
    key_consonants: 6,
  });
});

test('no hardcoded coreWords.json exists (words are fetched via commercial-free APIs + AsyncStorage cache)', () => {
  assert.equal(
    fs.existsSync(path.join(root, 'src/data/coreWords.json')),
    false,
    'Hardcoded coreWords.json must not exist'
  );
});

test('commercial-free wordApi and phoneticsParser modules exist and expose required endpoints', () => {
  const wordApiSrc = fs.readFileSync(path.join(root, 'src/services/wordApi.ts'), 'utf8');
  assert.ok(wordApiSrc.includes('api.dictionaryapi.dev'), 'Missing dictionaryapi.dev');
  assert.ok(wordApiSrc.includes('api.datamuse.com'), 'Missing Datamuse API');
  assert.ok(wordApiSrc.includes('freedictionaryapi.com'), 'Missing freedictionaryapi.com');
  assert.ok(wordApiSrc.includes('ko.wiktionary.org'), 'Missing ko.wiktionary.org');
  assert.ok(wordApiSrc.includes('api.mymemory.translated.net'), 'Missing MyMemory API');
});

test('words.tsx displays open-license commercial attribution', () => {
  const wordsScreenSrc = fs.readFileSync(path.join(root, 'src/app/(tabs)/words.tsx'), 'utf8');
  assert.ok(wordsScreenSrc.includes('CC BY-SA 4.0'), 'Missing CC BY-SA 4.0 attribution');
  assert.ok(wordsScreenSrc.includes('Datamuse'), 'Missing Datamuse attribution');
});

test('useSpeechAudio applies Android en-US locale workaround, status.error fallback, and AppState cleanup', () => {
  const audioSrc = fs.readFileSync(path.join(root, 'src/hooks/useSpeechAudio.ts'), 'utf8');
  assert.ok(audioSrc.includes("Platform.OS === 'android' ? 'en' : 'en-US'"));
  assert.ok(audioSrc.includes('getAvailableVoicesAsync'));
  assert.ok(audioSrc.includes('status.error'));
  assert.ok(audioSrc.includes('AppState.addEventListener'));
  assert.ok(audioSrc.includes('useApplicationAudioSession: true'));
});

test('both Zustand stores use safeAsyncStorage and unconditional hasHydrated recovery', () => {
  const learningSrc = fs.readFileSync(path.join(root, 'src/store/useLearningStore.ts'), 'utf8');
  const cacheSrc = fs.readFileSync(path.join(root, 'src/store/useWordCacheStore.ts'), 'utf8');
  assert.ok(learningSrc.includes('safeAsyncStorage'));
  assert.ok(learningSrc.includes('useLearningStore.getState().setHasHydrated(true)'));
  assert.ok(cacheSrc.includes('safeAsyncStorage'));
  assert.ok(cacheSrc.includes('useWordCacheStore.getState().setHasHydrated(true)'));
});

test('TabLayout and SymbolDetailSheet apply SafeArea insets and senior font scaling safeguards', () => {
  const tabLayoutSrc = fs.readFileSync(path.join(root, 'src/app/(tabs)/_layout.tsx'), 'utf8');
  const sheetSrc = fs.readFileSync(path.join(root, 'src/components/SymbolDetailSheet.tsx'), 'utf8');
  assert.ok(tabLayoutSrc.includes('useSafeAreaInsets'));
  assert.ok(sheetSrc.includes('useSafeAreaInsets'));
  assert.ok(sheetSrc.includes('statusBarTranslucent'));
  assert.ok(sheetSrc.includes('maxFontSizeMultiplier'));
});
