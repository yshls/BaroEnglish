import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

function collectJsonFiles(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJsonFiles(full, result);
    } else if (entry.name.endsWith('.json')) {
      result.push(path.relative(root, full));
    }
  }
  return result;
}

test('strict zero-JSON guardrail: NO hardcoded .json data files may exist anywhere under src/', () => {
  const jsonFiles = collectJsonFiles(path.join(root, 'src'));
  assert.deepEqual(
    jsonFiles,
    [],
    `Hardcoded JSON files are forbidden under src/: ${jsonFiles.join(', ')}`
  );
});

test('ipaCatalog.ts has 40 pure IPA metadata entries across 4 categories (18 core + 22 expanded) with zero hardcoded example words', () => {
  const catalogSrc = fs.readFileSync(
    path.join(root, 'src/data/ipaCatalog.ts'),
    'utf8'
  );
  assert.equal(
    /\bexamples\s*:/.test(catalogSrc),
    false,
    'ipaCatalog.ts must not hardcode static example word lists'
  );

  const symbolRegex =
    /id:\s*'([^']+)'[\s\S]*?categoryId:\s*'([^']+)'[\s\S]*?isCore:\s*(true|false)[\s\S]*?ipa:\s*'([^']+)'[\s\S]*?arpaTargets:\s*\[([^\]]+)\][\s\S]*?spellingPatterns:\s*\[([^\]]+)\]/g;
  const matches = [...catalogSrc.matchAll(symbolRegex)];
  assert.equal(matches.length, 40, 'Must contain exactly 40 IPA symbols');

  const byCategory = {
    basic_vowels: 0,
    diphthongs: 0,
    key_consonants: 0,
    basic_consonants: 0,
  };
  let coreCount = 0;
  for (const m of matches) {
    const [, id, categoryId, isCoreStr, , arpaRaw, patternsRaw] = m;
    byCategory[categoryId] += 1;
    if (isCoreStr === 'true') coreCount += 1;
    assert.ok(arpaRaw.includes("'"), `${id} must declare arpaTargets`);
    assert.ok(patternsRaw.includes("'"), `${id} must declare spellingPatterns`);
  }
  assert.equal(coreCount, 18, 'Must retain 18 core symbols');
  assert.deepEqual(byCategory, {
    basic_vowels: 11,
    diphthongs: 5,
    key_consonants: 14,
    basic_consonants: 10,
  });
});

test('commercial-free wordApi and phoneticsParser modules exist and expose required endpoints', () => {
  const wordApiSrc = fs.readFileSync(path.join(root, 'src/services/wordApi.ts'), 'utf8');
  assert.ok(wordApiSrc.includes('api.dictionaryapi.dev'), 'Missing dictionaryapi.dev');
  assert.ok(wordApiSrc.includes('api.datamuse.com'), 'Missing Datamuse API');
  assert.ok(wordApiSrc.includes('freedictionaryapi.com'), 'Missing freedictionaryapi.com');
  assert.ok(wordApiSrc.includes('ko.wiktionary.org'), 'Missing ko.wiktionary.org');
  assert.ok(wordApiSrc.includes('api.mymemory.translated.net'), 'Missing MyMemory API');
  assert.ok(wordApiSrc.includes('api.tatoeba.org'), 'Missing Tatoeba bilingual examples API');
});

test('index.tsx (Word Reader) displays open-license commercial attribution', () => {
  const wordsScreenSrc = fs.readFileSync(path.join(root, 'src/app/(tabs)/index.tsx'), 'utf8');
  assert.ok(wordsScreenSrc.includes('CC BY-SA 4.0'), 'Missing CC BY-SA 4.0 attribution');
  assert.ok(wordsScreenSrc.includes('Tatoeba'), 'Missing Tatoeba CC BY 2.0 FR attribution');
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

test('TabLayout places Word Reader first and applies SafeArea insets and senior font safeguards', () => {
  const tabLayoutSrc = fs.readFileSync(path.join(root, 'src/app/(tabs)/_layout.tsx'), 'utf8');
  const sheetSrc = fs.readFileSync(path.join(root, 'src/components/SymbolDetailSheet.tsx'), 'utf8');
  assert.ok(tabLayoutSrc.includes('useSafeAreaInsets'));
  assert.ok(
    tabLayoutSrc.indexOf('단어 바로 읽기') < tabLayoutSrc.indexOf('발음기호 기초'),
    '단어 바로 읽기 must appear before 발음기호 기초'
  );
  assert.ok(sheetSrc.includes('useSafeAreaInsets'));
  assert.ok(sheetSrc.includes('statusBarTranslucent'));
  assert.ok(sheetSrc.includes('maxFontSizeMultiplier'));
});

test('word bookmark feature is persisted in useWordCacheStore, wired in index.tsx, and exposed in dedicated Bookmarks tab', () => {
  const cacheSrc = fs.readFileSync(path.join(root, 'src/store/useWordCacheStore.ts'), 'utf8');
  const wordsSrc = fs.readFileSync(path.join(root, 'src/app/(tabs)/index.tsx'), 'utf8');
  const tabLayoutSrc = fs.readFileSync(path.join(root, 'src/app/(tabs)/_layout.tsx'), 'utf8');
  const bookmarksSrc = fs.readFileSync(path.join(root, 'src/app/(tabs)/bookmarks.tsx'), 'utf8');
  assert.ok(cacheSrc.includes('bookmarkedWordKeys'));
  assert.ok(cacheSrc.includes('toggleBookmark'));
  assert.ok(wordsSrc.includes('toggleBookmark'));
  assert.ok(wordsSrc.includes('isDisplayedWordBookmarked'));
  assert.ok(wordsSrc.includes('useLocalSearchParams'));
  assert.ok(tabLayoutSrc.includes('name="bookmarks"'), 'Bottom tab menu must include bookmarks tab');
  assert.ok(bookmarksSrc.includes('bookmarkedWordKeys'), 'bookmarks.tsx must render bookmarked words');
});

test('borderless UI rule: no non-zero borderWidth or borderColor in screens and components', () => {
  const uiFiles = [
    'src/app/_layout.tsx',
    'src/app/(tabs)/_layout.tsx',
    'src/app/(tabs)/bookmarks.tsx',
    'src/app/(tabs)/index.tsx',
    'src/app/(tabs)/shorts.tsx',
    'src/app/(tabs)/symbols.tsx',
    'src/components/BaroHeader.tsx',
    'src/components/PronunciationPracticeCard.tsx',
    'src/components/RhythmBlocks.tsx',
    'src/components/SymbolDetailSheet.tsx',
    'src/components/TappableExampleSentence.tsx',
    'src/components/WordMeaningSheet.tsx',
  ];

  const violations = [];
  for (const rel of uiFiles) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    if (/border(?:Top|Bottom|Left|Right)?Color\s*:/.test(src)) {
      violations.push(`${rel}: contains borderColor`);
    }
    const widthMatches = src.matchAll(/border(?:Top|Bottom|Left|Right)?Width\s*:\s*([0-9.]+)/g);
    for (const m of widthMatches) {
      if (Number(m[1]) > 0) {
        violations.push(`${rel}: contains ${m[0]}`);
      }
    }
  }
  assert.deepEqual(violations, [], `Borderless UI violations: ${violations.join(', ')}`);
});

test('vertical pronunciation shorts feed uses zero-hardcode dynamic Datamuse discovery and endless Reels scroll hooks', () => {
  const wordApiSrc = fs.readFileSync(path.join(root, 'src/services/wordApi.ts'), 'utf8');
  const shortsSrc = fs.readFileSync(path.join(root, 'src/app/(tabs)/shorts.tsx'), 'utf8');
  assert.ok(wordApiSrc.includes('fetchDailyFeedCandidates'));
  assert.equal(
    wordApiSrc.includes('FEED_TOPICS'),
    false,
    'Hardcoded FEED_TOPICS list must not exist; feed must discover words dynamically'
  );
  assert.ok(wordApiSrc.includes('String.fromCharCode(97'), 'Must discover words dynamically via A-Z wildcards');
  assert.ok(wordApiSrc.includes('rel_trg='), 'Must support dynamic associative word chaining');
  assert.ok(shortsSrc.includes('fetchDailyFeedCandidates'));
  assert.ok(shortsSrc.includes('pagingEnabled'));
  assert.ok(shortsSrc.includes('onEndReached'));
  assert.ok(shortsSrc.includes('onScroll={handleScroll}'));
  assert.ok(shortsSrc.includes('ListFooterComponent'));
  assert.ok(shortsSrc.includes('playFast'));
});

test('IPA symbol beginner/intermediate/advanced example words are dynamically fetched without JSON files', () => {
  const wordApiSrc = fs.readFileSync(path.join(root, 'src/services/wordApi.ts'), 'utf8');
  const sheetSrc = fs.readFileSync(path.join(root, 'src/components/SymbolDetailSheet.tsx'), 'utf8');
  const categoriesSrc = fs.readFileSync(path.join(root, 'src/data/categories.ts'), 'utf8');

  assert.equal(categoriesSrc.includes('.json'), false, 'categories.ts must never import JSON files');
  assert.ok(wordApiSrc.includes('export async function fetchSymbolExamplesByLevel'), 'Missing fetchSymbolExamplesByLevel');
  assert.ok(wordApiSrc.includes('md=r,f,p,s&ipa=1'), 'Must query Datamuse ARPAbet phonetics + frequency + syllables');
  assert.ok(wordApiSrc.includes('buildDynamicSymbolExample'), 'Must dynamically construct stress segments and emphasis tips');
  assert.ok(sheetSrc.includes('fetchSymbolExamplesByLevel'), 'SymbolDetailSheet must fetch examples dynamically');
  assert.ok(sheetSrc.includes('다른 단어'), 'SymbolDetailSheet must provide dynamic refresh button');
});

test('wordApi filters out specialized jargon/subsense translations and cleans ko.wiktionary extracts', () => {
  const wordApiSrc = fs.readFileSync(path.join(root, 'src/services/wordApi.ts'), 'utf8');
  assert.ok(wordApiSrc.includes('JARGON_DEF_PATTERN'), 'Missing jargon definition filter');
  assert.ok(wordApiSrc.includes('depth === 0 && i < 2'), 'Must restrict FreeDictionary Korean translations to top-level primary senses');
  assert.ok(wordApiSrc.includes('extractCleanKoWiktionaryMeaning'), 'Missing cleaned ko.wiktionary parser');
});

test('tappable example words and quick meaning sheet are wired in Word Reader and Shorts', () => {
  const wordApiSrc = fs.readFileSync(path.join(root, 'src/services/wordApi.ts'), 'utf8');
  const indexSrc = fs.readFileSync(path.join(root, 'src/app/(tabs)/index.tsx'), 'utf8');
  const shortsSrc = fs.readFileSync(path.join(root, 'src/app/(tabs)/shorts.tsx'), 'utf8');

  assert.ok(wordApiSrc.includes('export async function lookupQuickWordMeaning'), 'Missing lookupQuickWordMeaning');
  assert.ok(indexSrc.includes('TappableExampleSentence'), 'index.tsx must render TappableExampleSentence');
  assert.ok(indexSrc.includes('WordMeaningSheet'), 'index.tsx must mount WordMeaningSheet');
  assert.ok(shortsSrc.includes('TappableExampleSentence'), 'shorts.tsx must render TappableExampleSentence');
  assert.ok(shortsSrc.includes('WordMeaningSheet'), 'shorts.tsx must mount WordMeaningSheet');
});

test('recommended daily words are dynamically generated (beginner + intermediate mix) without hardcoded STARTER_SEARCH_CHIPS', () => {
  const cacheSrc = fs.readFileSync(path.join(root, 'src/store/useWordCacheStore.ts'), 'utf8');
  const wordApiSrc = fs.readFileSync(path.join(root, 'src/services/wordApi.ts'), 'utf8');
  const indexSrc = fs.readFileSync(path.join(root, 'src/app/(tabs)/index.tsx'), 'utf8');

  assert.equal(cacheSrc.includes('STARTER_SEARCH_CHIPS'), false, 'Static STARTER_SEARCH_CHIPS must not exist');
  assert.ok(wordApiSrc.includes('export async function fetchRecommendedDailyWords'), 'Missing fetchRecommendedDailyWords');
  assert.ok(indexSrc.includes('fetchRecommendedDailyWords'), 'index.tsx must use fetchRecommendedDailyWords');
  assert.equal(indexSrc.includes('기초 추천'), false, 'Updated label must drop 기초');
  assert.ok(indexSrc.includes('일상 추천 단어'), 'Simplified recommend tab must keep accessible 일상 추천 단어 label');
});

test('ephemeral pronunciation speaking comparison is wired with zero persistent audio storage', () => {
  const hookSrc = fs.readFileSync(path.join(root, 'src/hooks/usePronunciationPractice.ts'), 'utf8');
  const matcherSrc = fs.readFileSync(path.join(root, 'src/services/pronunciationMatcher.ts'), 'utf8');
  const indexSrc = fs.readFileSync(path.join(root, 'src/app/(tabs)/index.tsx'), 'utf8');
  const shortsSrc = fs.readFileSync(path.join(root, 'src/app/(tabs)/shorts.tsx'), 'utf8');

  assert.ok(matcherSrc.includes('evaluatePronunciationTranscripts'));
  assert.ok(matcherSrc.includes('toPhoneticSkeleton'));
  assert.ok(hookSrc.includes('URL.revokeObjectURL'), 'Must immediately revoke ephemeral web recording URLs');
  assert.equal(hookSrc.includes('AsyncStorage'), false, 'Must never persist voice recordings to AsyncStorage');
  assert.equal(hookSrc.includes('localStorage'), false, 'Must never persist voice recordings to localStorage');
  assert.ok(indexSrc.includes('PronunciationPracticeCard'), 'index.tsx must render PronunciationPracticeCard');
  assert.ok(shortsSrc.includes('PronunciationPracticeSheet'), 'shorts.tsx must mount PronunciationPracticeSheet');
});

test('UX polish: seamless inline example sentences, intact full word in symbol sheet, and weak-vowel re- -> 리 fix', () => {
  const sentenceSrc = fs.readFileSync(path.join(root, 'src/components/TappableExampleSentence.tsx'), 'utf8');
  const sheetSrc = fs.readFileSync(path.join(root, 'src/components/SymbolDetailSheet.tsx'), 'utf8');
  const parserSrc = fs.readFileSync(path.join(root, 'src/services/phoneticsParser.ts'), 'utf8');

  assert.equal(sentenceSrc.includes('wordChip'), false, 'Example sentence must render seamlessly inline, not chopped word chips');
  assert.ok(sentenceSrc.includes('onPress={() => onWordPress(tok.cleanWord)}'), 'Each word must remain tappable inline');
  assert.ok(sheetSrc.includes('splitWordBlock'), 'SymbolDetailSheet must render intact full word above syllable breakdown');
  assert.ok(parserSrc.includes('shouldUseShortIInsteadOfSchwa'), 'phoneticsParser must normalize CMUdict AH0 weak-vowel merger');
});

test('My Page (bookmarks tab) provides nickname setting, usage time stats, consecutive streak tracking, and bookmarks below', () => {
  const storeSrc = fs.readFileSync(path.join(root, 'src/store/useLearningStore.ts'), 'utf8');
  const trackerSrc = fs.readFileSync(path.join(root, 'src/hooks/useStudyTracker.ts'), 'utf8');
  const rootLayoutSrc = fs.readFileSync(path.join(root, 'src/app/_layout.tsx'), 'utf8');
  const myPageSrc = fs.readFileSync(path.join(root, 'src/app/(tabs)/bookmarks.tsx'), 'utf8');

  assert.ok(storeSrc.includes('setNickname'), 'useLearningStore must expose setNickname');
  assert.ok(storeSrc.includes('addStudySeconds'), 'useLearningStore must expose addStudySeconds');
  assert.ok(storeSrc.includes('recordAppVisit'), 'useLearningStore must expose recordAppVisit');
  assert.ok(storeSrc.includes('currentStreakDays'), 'useLearningStore must persist currentStreakDays');
  assert.ok(trackerSrc.includes('AppState.addEventListener'), 'useStudyTracker must handle foreground/background');
  assert.ok(rootLayoutSrc.includes('useStudyTracker'), 'RootLayout must mount useStudyTracker');
  assert.ok(myPageSrc.includes('나의 학습 통계'), 'My Page must render study statistics section');
  assert.ok(myPageSrc.includes('연속 실행'), 'My Page must render consecutive streak metric');
  assert.ok(myPageSrc.includes('저장한 단어 · 발음기호'), 'My Page must render saved items below stats');
  assert.ok(
    myPageSrc.indexOf('나의 학습 통계') < myPageSrc.indexOf('저장한 단어 · 발음기호'),
    'Stats and streak section must appear above saved items'
  );
});

