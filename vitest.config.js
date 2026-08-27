import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./tests/helpers/chrome-mock.js'],
    // background.js logs verbosely when DEBUG is on (it is, and DEBUG also gates dev-only
    // features, so it cannot just be turned off under test). Hide output from passing
    // tests but keep it for failures, where it is the useful part.
    silent: 'passed-only'
  }
});
