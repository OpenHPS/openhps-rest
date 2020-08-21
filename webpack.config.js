const TerserPlugin = require('terser-webpack-plugin');
const WebpackAutoInject = require('webpack-auto-inject-version');
const path = require('path');

module.exports = [
{
  mode: 'development',
  entry: './dist/client/index.js',
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'openhps-rest-client.js',
    library: '@openhps/rest',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: `(typeof self !== 'undefined' ? self : this)`,
  },
  plugins: [
    new WebpackAutoInject({
      SHORT: '@openhps/rest',
      components: {
        AutoIncreaseVersion: false,
      },
      componentsOptions: {
        InjectAsComment: {
          tag: 'Version: {version} - {date}',
          dateFormat: 'isoDate',
        },
      },
    }),
  ],
  externals: ["@openhps/core"],
},{
  mode: 'production',
  entry: './dist/client/index.js',
  devtool: 'source-map',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          keep_classnames: true,
          keep_fnames: true
        }
      })
    ]
  },
  plugins: [
    new WebpackAutoInject({
      SHORT: '@openhps/rest',
      components: {
        AutoIncreaseVersion: false,
      },
      componentsOptions: {
        InjectAsComment: {
          tag: 'Version: {version} - {date}',
          dateFormat: 'isoDate',
        },
      },
    }),
  ],
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },
  externals: ["@openhps/core"],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'openhps-rest-client.min.js',
    library: '@openhps/rest',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: `(typeof self !== 'undefined' ? self : this)`,
  }
}];