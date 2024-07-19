const path = require("path");
const webpack = require("webpack");
const Dotenv = require('dotenv-webpack');

module.exports = {
  mode: "production", // 'production' for optimized output, 'development' for debuggable output
  entry: {
    wallet_connect: "./public/src/walletconnect/wallet_connect.ts",
    xrp_wallet_connect: "./public/src/walletconnect/xrp_wallet_connect.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name]/bundle.js", // Output files named and placed according to the entry configuration
    chunkFilename: "[name].chunk.js", // Names dynamically loaded chunks
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
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"], // Automatically resolve these extensions
    fallback: {
      "path": require.resolve("path-browserify"),
      "os": require.resolve("os-browserify/browser"),
      "crypto": require.resolve("crypto-browserify"),
      "vm": require.resolve("vm-browserify"),
      "stream": require.resolve("stream-browserify"),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"], // Polyfill Buffer using the 'buffer' package
    }),
    new Dotenv()
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
