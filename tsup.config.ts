import { defineConfig } from 'tsup';

// Library build: ESM + CJS with declarations and source maps. Peer dependencies stay
// external so the consuming app's bundler can dedupe and tree-shake them.
export default defineConfig({
  entry: { index: 'src/index.ts', utils: 'src/utils.ts' },
  outDir: 'dist/lib',
  format: ['esm', 'cjs'],
  outExtension: ({ format }) => ({ js: format === 'esm' ? '.mjs' : '.cjs' }),
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // Shared code goes into a common chunk so both entry points use the same
  // WalletConnectError class (instanceof keeps working across them).
  splitting: true,
  platform: 'browser',
  target: 'es2020',
  external: [/^@reown\//, 'ethers'],
});
