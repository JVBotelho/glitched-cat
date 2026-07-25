export function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

export function getOrpIndex(word: string): number {
  const letterCount = word.replace(/[^\p{L}\p{N}]/gu, "").length;

  // Punctuation-only "word": just aim for the middle
  if (letterCount === 0) return Math.floor(word.length / 2);

  // Classic Spritz heuristic: which letter (0-based) the eye anchors on
  let target: number;
  if (letterCount <= 1) target = 0;
  else if (letterCount <= 5) target = 1;
  else if (letterCount <= 9) target = 2;
  else if (letterCount <= 13) target = 3;
  else target = 4;

  // Map the target letter back to its index in the original string,
  // skipping punctuation (e.g. "/labs/llm-canary" highlights "s", not "b")
  let seen = -1;
  for (let i = 0; i < word.length; i++) {
    if (/[\p{L}\p{N}]/u.test(word[i])) {
      seen++;
      if (seen === target) return i;
    }
  }
  return 0;
}

export function getWordDelay(word: string, wpm: number): number {
  const baseDelay = 60000 / wpm;

  if (word.endsWith(".") || word.endsWith("!") || word.endsWith("?")) {
    return baseDelay * 2;
  }

  if (word.endsWith(",") || word.endsWith(";") || word.endsWith(":")) {
    return baseDelay * 1.5;
  }

  if (word.length > 10) {
    return baseDelay * 1.2;
  }

  return baseDelay;
}

export type RsvpState = {
  isPlaying: boolean;
  index: number;
  total: number;
};

export type RsvpPlayerOptions = {
  wpm?: number;
  onWord?: (word: string, index: number) => void;
  onStateChange?: (state: RsvpState) => void;
  onComplete?: () => void;
};

export class RsvpPlayer {
  private words: string[];
  private wpm: number;
  private onWord?: (word: string, index: number) => void;
  private onStateChange?: (state: RsvpState) => void;
  private onComplete?: () => void;

  private currentIndex: number = 0;
  private isPlaying: boolean = false;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(words: string[], options: RsvpPlayerOptions = {}) {
    this.words = words;
    this.wpm = options.wpm || 300;
    this.onWord = options.onWord;
    this.onStateChange = options.onStateChange;
    this.onComplete = options.onComplete;
  }

  private notifyState() {
    if (this.onStateChange) {
      this.onStateChange({
        isPlaying: this.isPlaying,
        index: this.currentIndex,
        total: this.words.length,
      });
    }
  }

  private scheduleNext() {
    if (!this.isPlaying || this.currentIndex >= this.words.length) {
      this.pause();
      if (this.currentIndex >= this.words.length && this.onComplete) {
        this.onComplete();
      }
      return;
    }

    const word = this.words[this.currentIndex];
    const delay = getWordDelay(word, this.wpm);

    if (this.onWord) {
      this.onWord(word, this.currentIndex);
    }

    this.currentIndex++;
    this.notifyState();

    this.timeoutId = setTimeout(() => {
      this.scheduleNext();
    }, delay);
  }

  play() {
    if (this.isPlaying || this.words.length === 0) return;

    if (this.currentIndex >= this.words.length) {
      this.currentIndex = 0;
    }

    this.isPlaying = true;
    this.notifyState();
    this.scheduleNext();
  }

  pause() {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.notifyState();
  }

  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  setWpm(wpm: number) {
    this.wpm = wpm;
  }

  seek(index: number) {
    this.currentIndex = Math.max(0, Math.min(index, this.words.length - 1));
    if (this.onWord && this.words[this.currentIndex]) {
      this.onWord(this.words[this.currentIndex], this.currentIndex);
    }
    this.notifyState();
  }

  back(n: number) {
    this.seek(this.currentIndex - n);
  }

  getState(): RsvpState {
    return {
      isPlaying: this.isPlaying,
      index: this.currentIndex,
      total: this.words.length,
    };
  }

  destroy() {
    this.pause();
  }
}

export function createRsvpPlayer(words: string[], options: RsvpPlayerOptions) {
  return new RsvpPlayer(words, options);
}
