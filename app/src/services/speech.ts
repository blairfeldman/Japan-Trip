import * as Speech from 'expo-speech';

export interface PracticePlayback {
  stop: () => void;
}

/**
 * Speaks `kana` aloud in Japanese via the on-device TTS engine, and drives
 * a word-by-word highlight over `words` on a fixed cadence timed to the
 * chosen rate. Two tap speeds only, per the design: normal (~460ms/word)
 * and slow (~900ms/word, rate 0.55).
 */
export function playPractice(
  kana: string,
  words: string[],
  opts: { slow: boolean; onWord: (index: number) => void; onDone: () => void }
): PracticePlayback {
  const stepMs = opts.slow ? 900 : 460;
  let i = 0;
  opts.onWord(0);
  Speech.speak(kana, {
    language: 'ja-JP',
    rate: opts.slow ? 0.55 : 0.95,
    pitch: 1.0,
  });
  const timer = setInterval(() => {
    i += 1;
    if (i >= words.length) {
      clearInterval(timer);
      opts.onWord(-1);
      opts.onDone();
      return;
    }
    opts.onWord(i);
  }, stepMs);

  return {
    stop: () => {
      clearInterval(timer);
      Speech.stop();
      opts.onWord(-1);
    },
  };
}

export function speakShort(text: string, slow = false) {
  Speech.speak(text, { language: 'ja-JP', rate: slow ? 0.55 : 0.95, pitch: 1.0 });
}
