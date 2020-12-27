const path = require('path');

module.exports = [
{
  mode: 'development',
  entry: './dist/cjs/index.js',
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist/web'),
    filename: 'openhps-rest.js',
    library: '@openhps/rest',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: `(typeof self !== 'undefined' ? self : this)`,
  },
  externals: ["@openhps/core"],
},{
  mode: 'production',
  entry: './dist/cjs/index.js',
  devtool: 'source-map',
  optimization: {
    minimize: true,
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },
  externals: ["@openhps/core"],
  output: {
    path: path.resolve(__dirname, 'dist/web'),
    filename: 'openhps-rest.min.js',
    library: '@openhps/rest',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: `(typeof self !== 'undefined' ? self : this)`,
  }
}];