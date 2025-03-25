const path = require("path");
const webpack = require("webpack");
const Dotenv = require("dotenv-webpack");

module.exports = {
  mode: "production", // 'production' for optimized output, 'development' for debuggable output
  entry: {
    wallet_connect: "./public/src/walletconnect/wallet_connect.ts",
    tron_connect: "./public/src/walletconnect/tron_connect.js",
    solana_connect: "./public/src/walletconnect/solana_connect.tsx",
    lucid: "./public/src/walletconnect/Lucid.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name]/bundle.js", // Output files named and placed according to the entry configuration
    chunkFilename: "[name].chunk.js", // Names dynamically loaded chunks
    library: "MyLibrary", // Name of the global library
    libraryTarget: "umd", // Universal Module Definition (UMD) for compatibility
    umdNamedDefine: true, // Define the UMD name for AMD
    globalObject: "this", // Ensure compatibility across different environments
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
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
      process: "process/browser", // Polyfill process
    }),
    new Dotenv(),
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
