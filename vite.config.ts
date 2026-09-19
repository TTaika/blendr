import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3001' },
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    // Exclude nested agent worktrees (.claude/worktrees/**) so their own copies of the test
    // suite don't get picked up alongside this project's tests.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});
