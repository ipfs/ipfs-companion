const path = require('path')
const webpack = require('webpack')
const SimpleProgressWebpackPlugin = require('simple-progress-webpack-plugin')
// const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
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
    /*
    occurrenceOrder: true,
    minimizer: [
      new UglifyJsPlugin({
        cache: true,
        parallel: true,
        sourceMap: true,
        uglifyOptions: {
          keep_classnames: true,
          keep_fnames: true,
          compress: {
            inline: 0
          },
        }
      })
    ],
    */
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
  /*
  */
  // plugins: [new BundleAnalyzerPlugin()]
  plugins: [
    /*
    // Keep bundle size below 4MB: https://github.com/mozilla/addons-linter/pull/892
    // TODO: revisit if this can be automated (for now we do semi-manual split in splitChunks.cacheGroups)
    new webpack.optimize.AggressiveSplittingPlugin({
      maxSize: 4194304
    }),
    */
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
  resolve: {
    modules: [
      'node_modules'
    ],
    alias: {
      // These are needed because node-libs-browser depends on outdated
      // versions
      // zlib: can be dropped once https://github.com/devongovett/browserify-zlib/pull/18 is shipped
      zlib: 'browserify-zlib',
      // http: can be dropped once https://github.com/webpack/node-libs-browser/pull/41 is shipped
      http: 'stream-http'
    }
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
