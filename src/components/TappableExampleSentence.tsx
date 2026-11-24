import { Fragment } from 'react';
import { Platform, StyleSheet, Text, type TextStyle } from 'react-native';
import { sanitizeEnglishWord } from '../services/wordApi';
import { COLORS, TYPOGRAPHY } from '../theme/tokens';

interface TappableExampleSentenceProps {
  sentence: string;
  targetWord?: string;
  selectedWord?: string | null;
  onWordPress: (word: string) => void;
  /** 쇼츠 카드 내부 등 컴팩트한 공간에 맞출 때 사용 */
  compact?: boolean;
}

interface SentenceToken {
  raw: string;
  leadingPunct: string;
  wordPart: string;
  trailingPunct: string;
  cleanWord: string;
}

const WEB_CLICKABLE_TEXT_STYLE: TextStyle | undefined =
  Platform.OS === 'web'
    ? ({ cursor: 'pointer' } as unknown as TextStyle)
    : undefined;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isTargetWordMatch(cleanWord: string, targetWord?: string): boolean {
  if (!cleanWord || !targetWord) return false;
  const target = targetWord.trim().toLowerCase();
  if (!target) return false;
  if (cleanWord === target) return true;
  const stem =
    target.endsWith('y') && target.length > 3
      ? `${escapeRegex(target.slice(0, -1))}(?:y|ies|ied)`
      : `${escapeRegex(target)}(?:s|es|ed|ing)?`;
  return new RegExp(`^${stem}$`, 'i').test(cleanWord);
}

function tokenizeSentence(sentence: string): SentenceToken[] {
  return sentence
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const match =
        /^([^A-Za-z']*)([A-Za-z]+(?:'[A-Za-z]+)?(?:-[A-Za-z]+)*)([^A-Za-z']*)$/.exec(
          raw
        );
      if (!match) {
        return {
          raw,
          leadingPunct: '',
          wordPart: '',
          trailingPunct: raw,
          cleanWord: '',
        };
      }
      const wordPart = match[2];
      return {
        raw,
        leadingPunct: match[1],
        wordPart,
        trailingPunct: match[3],
        cleanWord: sanitizeEnglishWord(wordPart),
      };
    });
}

/**
 * 문장을 조각조각 칩으로 쪼개지 않고 자연스러운 한 문장 텍스트 그대로 표시하면서,
 * 문장 속 어떤 영어 단어를 눌러도 바로 뜻 바텀시트를 띄워줍니다.
 */
export function TappableExampleSentence({
  sentence,
  targetWord,
  selectedWord,
  onWordPress,
  compact = false,
}: TappableExampleSentenceProps) {
  const tokens = tokenizeSentence(sentence);
  const normalizedSelected = selectedWord ? sanitizeEnglishWord(selectedWord) : '';

  return (
    <Text
      style={[styles.sentence, compact && styles.sentenceCompact]}
      maxFontSizeMultiplier={1.45}
    >
      {tokens.map((tok, idx) => {
        const space = idx > 0 ? ' ' : '';

        if (!tok.cleanWord) {
          return (
            <Fragment key={`punct-${idx}-${tok.raw}`}>
              {space}
              {tok.raw}
            </Fragment>
          );
        }

        const isTarget = isTargetWordMatch(tok.cleanWord, targetWord);
        const isSelected = Boolean(
          normalizedSelected && tok.cleanWord === normalizedSelected
        );

        return (
          <Fragment key={`tok-${idx}-${tok.raw}`}>
            {space}
            {tok.leadingPunct}
            <Text
              onPress={() => onWordPress(tok.cleanWord)}
              suppressHighlighting={false}
              style={[
                styles.tappableWord,
                WEB_CLICKABLE_TEXT_STYLE,
                isTarget && styles.targetWord,
                isSelected && styles.selectedWord,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${tok.wordPart} 단어 뜻 보기`}
            >
              {tok.wordPart}
            </Text>
            {tok.trailingPunct}
          </Fragment>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  sentence: {
    fontSize: TYPOGRAPHY.bodyLarge,
    lineHeight: 33,
    fontWeight: '400',
    color: COLORS.text,
  },
  sentenceCompact: {
    fontSize: TYPOGRAPHY.body,
    lineHeight: 28,
  },
  tappableWord: {
    color: COLORS.text,
  },
  targetWord: {
    color: COLORS.accentText,
    fontWeight: '700',
    backgroundColor: COLORS.accentSoft,
  },
  selectedWord: {
    color: COLORS.indigoText,
    fontWeight: '700',
    backgroundColor: COLORS.indigoSoft,
  },
});
