const path = require('path')
const webpack = require('webpack')
const merge = require('webpack-merge')
const SimpleProgressWebpackPlugin = require('simple-progress-webpack-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

// common configuration shared by all targets
const commonConfig = {
  target: 'web',
  bail: true,
  output: {
    path: path.resolve(__dirname, 'add-on/dist/bundles'),
    publicPath: '/dist/bundles/',
    filename: '[name].bundle.js'
  },
  optimization: {
    minimizer: [
      // Default flags break js-ipfs: https://github.com/ipfs-shipyard/ipfs-companion/issues/521
      new UglifyJsPlugin({
        parallel: true,
        extractComments: true,
        uglifyOptions: {
          compress: { unused: false },
          mangle: true
        }
      })
    ]
  },
  // plugins: [new BundleAnalyzerPlugin()]
  plugins: [
    new SimpleProgressWebpackPlugin({
      format: process.env.CI ? 'expanded' : 'compact'
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
  performance: {
    maxEntrypointSize: Infinity,
    maxAssetSize: 4194304 // https://github.com/mozilla/addons-linter/pull/892
  }
}

// background page bundle (with heavy dependencies)
const bgConfig = merge(commonConfig, {
  name: 'background',
  entry: {
    backgroundPage: './add-on/src/background/background.js'
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
        }
      }
    }
  }
})

// user interface pages with shared common libraries
const uiConfig = merge(commonConfig, {
  name: 'ui',
  entry: {
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
        uiCommons: {
          name: 'uiCommons',
          minChunks: 2,
          enforce: true,
          // Exclude backend dependencies (known to slow down UI due to size)
          chunks: chunk => chunk.name !== 'backgroundPage'
        }
      }
    }
  }
})

// content scripts injected into tabs
const contentScriptsConfig = merge(commonConfig, {
  name: 'contentScripts',
  entry: {
    ipfsProxyContentScriptPayload: './add-on/src/contentScripts/ipfs-proxy/page.js',
    linkifyContentScript: './add-on/src/contentScripts/linkifyDOM.js',
    normalizeLinksContentScript: './add-on/src/contentScripts/normalizeLinksWithUnhandledProtocols.js'
  }
})

// special content script that injects window.ipfs into REAL window object
// (by default scripts executed via tabs.executeScript get a sandbox version)
const proxyContentScriptConfig = merge(commonConfig, {
  name: 'proxyContentScript',
  dependencies: ['contentScripts'],
  entry: {
    // below is just a loader for ipfsProxyContentScriptPayload
    ipfsProxyContentScript: './add-on/src/contentScripts/ipfs-proxy/content.js'
  },
  module: {
    rules: [
      {
        exclude: /node_modules/,
        test: /\.js$/,
        use: ['babel-loader']
      },
      {
        // payload is already in bundled form, so we load raw code as-is
        test: /ipfsProxyContentScriptPayload\.bundle\.js$/,
        loader: 'raw-loader'
      }
    ]
  }
})

module.exports = [
  bgConfig,
  uiConfig,
  contentScriptsConfig,
  proxyContentScriptConfig
]
