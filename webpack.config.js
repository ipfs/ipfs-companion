const path = require('path')
const webpack = require('webpack')
const SimpleProgressWebpackPlugin = require('simple-progress-webpack-plugin')
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  target: 'web',
  entry: {
    backgroundPage: './add-on/src/background/background.js',
    browserAction: './add-on/src/popup/browser-action/index.js',
    pageAction: './add-on/src/popup/page-action/index.js',
    uploadPage: './add-on/src/popup/quick-upload.js',
    optionsPage: './add-on/src/options/options.js',
    proxyAclManagerPage: './add-on/src/pages/proxy-acl/index.js',
    proxyAclDialog: './add-on/src/pages/proxy-access-dialog/index.js'
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendors: false,
        default: false,
        ipfs: {
          name: 'ipfs',
          priority: 10,
          enforce: true,
          // Include js-ipfs and js-ipfs-api
          test: /\/node_modules\/(ipfs|ipfs-api)\//
        },
        uiCommons: {
          name: 'uiCommons',
          minChunks: 2,
          enforce: true,
          // Exclude backend dependencies (known to slow down UI due to size)
          chunks: chunk => chunk.name !== 'backgroundPage'
        }
      }
    }
  },
  // plugins: [new BundleAnalyzerPlugin()]
  plugins: [
    new SimpleProgressWebpackPlugin({
      format: process.env.CI ? 'expanded' : 'minimal'
    }),
    new webpack.DefinePlugin({
      global: 'window', // https://github.com/webpack/webpack/issues/5627#issuecomment-394309966
      'process.env': {
        NODE_ENV: '"production"'
      }
    })
  ],
  module: {
    rules: [
      {
        exclude: /node_modules/,
        test: /\.js$/,
        use: ['babel-loader']
      },
      {
        test: /\.js$/,
        include: path.join(__dirname, 'add-on', 'src', 'contentScripts', 'ipfs-proxy'),
        loader: 'transform-loader?brfs'
      }
    ]
  },
  node: {
    global: false, // https://github.com/webpack/webpack/issues/5627#issuecomment-394309966
    Buffer: true,
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  },
  output: {
    path: path.resolve(__dirname, 'add-on/dist/bundles'),
    publicPath: '/dist/bundles/',
    filename: '[name].bundle.js'
  },
  performance: {
    maxEntrypointSize: Infinity,
    maxAssetSize: 4194304 // https://github.com/mozilla/addons-linter/pull/892
  }
}
