# Test Fixtures

These files are used by `scripts/test-validation.ts` and later pipeline test scripts.

## Files

| File | Purpose |
|------|---------|
| `sample.mp3` | Valid small MP3 (silent, ~1 KB) — used for format acceptance tests |
| `sample.wav` | Valid small WAV (silent) |
| `sample.m4a` | Valid small M4A (silent) |
| `sample.aac` | Valid small AAC (silent) |
| `sample.ogg` | Valid small OGG (silent) |
| `sample.webm` | Valid small WEBM (silent) |
| `sample.flac` | Valid small FLAC (silent) |
| `invalid.txt` | Plain text file for format rejection testing |
| `invalid.exe` | Empty file with .exe extension for format rejection testing |

> **Note**: The silent audio files are minimal valid files. For real transcription
> testing in Phase 3, you may want to replace or supplement these with files
> containing actual speech.
