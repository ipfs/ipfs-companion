const path = require('path')
const webpack = require('webpack')
const merge = require('webpack-merge')
const SimpleProgressWebpackPlugin = require('simple-progress-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

// common configuration shared by all targets
const commonConfig = {
  target: 'web',
  bail: true,
  output: {
    path: path.resolve(__dirname, 'add-on/dist/bundles/'),
    publicPath: '/dist/bundles/',
    filename: '[name].bundle.js'
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          // Speed Up
          cache: true,
          parallel: true,
          // Custom settings to unbreak js-ipfs
          compress: {
            unused: false // https://github.com/ipfs-shipyard/ipfs-companion/issues/521
          },
          mangle: true // https://github.com/ipfs-shipyard/ipfs-companion/issues/521
        }
      })
    ]
  },
  // plugins: [new BundleAnalyzerPlugin()]
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new SimpleProgressWebpackPlugin({
      format: process.env.CI ? 'expanded' : 'minimal'
    }),
    new webpack.DefinePlugin({
      global: 'window', // https://github.com/webpack/webpack/issues/5627#issuecomment-394309966
      'process.env': {
        NODE_ENV: '"production"',
        IPFS_MONITORING: false,
        DEBUG: false // controls verbosity of Hapi HTTP server in js-ipfs
      }
    })
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              hmr: process.env.NODE_ENV === 'development'
            }
          },
          'css-loader'
        ]
      },
      {
        test: /\.(png|jpe?g|gif|svg|eot|otf|ttf|woff|woff2)$/i,
        loader: 'file-loader',
        options: {
          name: 'assets/[name].[ext]'
        }
      },
      {
        // Ignore legacy fonts (both Firefox and Chromium talk WOFF2)
        test: /\.(otf|eot|ttf|woff)(\?.*$|$)/,
        use: ['raw-loader', 'ignore-loader']
      },
      {
        exclude: /node_modules/,
        test: /\.js$/,
        use: ['babel-loader']
      }
    ]
  },
  resolve: {
    /* mainFields: ['browser', 'main'], */
    extensions: ['.js', '.json'],
    alias: {
      url: 'iso-url',
      stream: 'readable-stream', // cure general insanity
      http: 'http-node', // chrome.sockets
      dns: 'http-dns', // chrome.sockets
      dgram: 'chrome-dgram', // chrome.sockets
      net: 'chrome-net' // chrome.sockets
    }
  },
  node: {
    global: false, // https://github.com/webpack/webpack/issues/5627#issuecomment-394309966
    Buffer: true,
    fs: 'empty',
    tls: 'empty',
    cluster: 'empty' // expected by js-ipfs dependency: node_modules/prom-client/lib/cluster.js
  },
  watchOptions: {
    ignored: ['add-on/dist/**/*', 'node_modules']
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
          // Include js-ipfs and js-ipfs-http-client
          test: /\/node_modules\/(ipfs|ipfs-api|ipfs-http-client)\//
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
    importPage: './add-on/src/popup/quick-import.js',
    optionsPage: './add-on/src/options/options.js',
    proxyAclManagerPage: './add-on/src/pages/proxy-acl/index.js',
    proxyAclDialog: './add-on/src/pages/proxy-access-dialog/index.js',
    welcomePage: './add-on/src/landing-pages/welcome/index.js'
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
    linkifyContentScript: './add-on/src/contentScripts/linkifyDOM.js'
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
