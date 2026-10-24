import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'public/src/wallet_connect/**',
      // Not part of the build and intentionally left unmodified on this branch (see README).
      'public/src/walletconnect/xrp_wallet_connect.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Node: Express server, build scripts, server-side helpers.
    files: ['index.js', 'copyBundle.js', 'webpack.config.js', 'lib/**/*.js', 'scripts/**/*.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // Browser page scripts bundled by webpack.
    files: ['public/src/**/*.{js,ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
);
