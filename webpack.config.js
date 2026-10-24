const path = require("path");
const webpack = require("webpack");

const shared = {
  mode: "production", // 'production' for optimized output, 'development' for debuggable output
  devtool: "source-map", // Emit .map files next to every bundle and chunk
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          // Type checking runs separately via `npm run typecheck`.
          options: { transpileOnly: true, compilerOptions: { noEmit: false } },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"], // Transpile JS using Babel
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/, // CSS loader configuration
        use: ["style-loader", "css-loader"], // Inject CSS into the DOM and resolve CSS imports
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".css"], // Automatically resolve these extensions
    fallback: {
      path: require.resolve("path-browserify"),
      os: require.resolve("os-browserify/browser"),
      crypto: require.resolve("crypto-browserify"),
      vm: require.resolve("vm-browserify"),
      stream: require.resolve("stream-browserify"),
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      zlib: require.resolve("browserify-zlib"),
      url: require.resolve("url/"),
      buffer: require.resolve("buffer/"),
      process: require.resolve("process/browser"),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"], // Polyfill Buffer using the 'buffer' package
      // Absolute path: ESM packages (AppKit, WalletConnect) require fully specified requests.
      process: require.resolve("process/browser"), // Polyfill process
    }),
  ],
  optimization: {
    splitChunks: {
      chunks: "async", // Only split chunks for asynchronous modules
      cacheGroups: {
        default: false, // Disables automatic grouping
        vendors: false, // Disables automatic vendor splitting
      },
    },
  },
};

module.exports = [
  // Page scripts loaded with a plain <script> tag. They only touch the DOM, so they are
  // emitted as browser scripts rather than a shared UMD global.
  {
    ...shared,
    name: "pages",
    entry: {
      wallet_connect: "./public/src/walletconnect/wallet_connect.ts",
      tron_connect: "./public/src/walletconnect/tron_connect.js",
      solana_connect: "./public/src/walletconnect/solana_connect.tsx",
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name]/bundle.js", // Output files named and placed according to the entry configuration
      chunkFilename: "chunks/[name].[contenthash:8].js", // Lazily loaded chunks (e.g. Reown AppKit)
      clean: { keep: /^(lucid|lib)\// },
    },
  },
  // Lucid is imported by views/lucidpackage.ejs with `import { ... } from ".../bundle.js"`,
  // so it must be an ES module (lucid-cardano also uses top-level await for its WASM).
  {
    ...shared,
    name: "lucid",
    entry: { lucid: "./public/src/walletconnect/Lucid.js" },
    experiments: { outputModule: true },
    output: {
      path: path.resolve(__dirname, "dist/lucid"),
      filename: "bundle.js",
      chunkFilename: "chunks/[name].[contenthash:8].js",
      assetModuleFilename: "assets/[hash][ext]",
      library: { type: "module" },
      clean: true,
    },
  },
];
