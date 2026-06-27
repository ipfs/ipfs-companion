import path from 'path'
import { rspack } from '@rspack/core'
import { merge } from 'webpack-merge'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const devBuild = process.env.NODE_ENV === 'development'

// SWC handles both the JS and TS rules; targets match the manifests' minimum
// supported browsers (minimum_chrome_version and gecko strict_min_version)
const swcLoader = (syntax) => ({
  loader: 'builtin:swc-loader',
  options: {
    jsc: { parser: { syntax } },
    env: { targets: { chrome: '111', firefox: '111' } }
  }
})

/**
 * common configuration shared by all targets
 * @type {import('@rspack/core').Configuration}
 */
const commonConfig = {
  target: 'web',
  bail: true,
  output: {
    path: path.resolve(__dirname, './add-on/dist/bundles/'),
    publicPath: '/dist/bundles/',
    filename: '[name].bundle.js',
    environment: {
      // Don't use node: protocol for core modules in browser builds
      nodePrefixForCoreModules: false
    }
  },
  // rspack's in-memory cache speeds up watch rebuilds; off in CI (single cold run)
  cache: !process.env.CI,
  // keep css-loader handling .css (it resolves the ~ @imports); rspack's native CSS is off
  experiments: {
    css: false
  },
  optimization: {
    minimize: true,
    minimizer: [
      new rspack.SwcJsMinimizerRspackPlugin()
    ]
  },
  plugins: [
    new rspack.ProgressPlugin({
      percentBy: 'entries'
    }),
    new rspack.CssExtractRspackPlugin({
      filename: '[name].css'
    }),
    new rspack.ProvidePlugin({
      process: 'process/browser.js'
    }),
    new rspack.DefinePlugin({
      global: 'globalThis', // https://github.com/webpack/webpack/issues/5627#issuecomment-394309966
      'process.emitWarning': (message, type) => {}, // console.warn(`${type}${type ? ': ' : ''}${message}`),
      'process.env': {
        // NODE_ENV: '"production"',
        IPFS_MONITORING: false,
        DEBUG: false // controls verbosity of Hapi HTTP server in js-ipfs
      }
    })
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [rspack.CssExtractRspackPlugin.loader, 'css-loader']
      },
      {
        test: /\.(png|jpe?g|gif|svg|eot|otf|ttf|woff|woff2)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][ext]'
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
        use: [swcLoader('ecmascript')]
      },
      {
        exclude: /node_modules/,
        test: /\.ts$/,
        use: [swcLoader('typescript')]
      }
    ]
  },
  resolve: {
    mainFields: ['browser', 'main'],
    extensions: ['.js', '.json', '.ts'],
    extensionAlias: {
      '.js': ['.js', '.json', '.ts']
    },
    alias: {
      url: 'iso-url'
    },
    fallback: {
      worker_threads: false,
      fs: false,
      process: require.resolve('process/browser.js')
    }
  },
  node: {
    global: false // https://github.com/webpack/webpack/issues/5627#issuecomment-394309966
  },
  watchOptions: {
    ignored: ['add-on/dist/**/*', 'node_modules']
  },
  performance: {
    maxEntrypointSize: Infinity,
    maxAssetSize: 4194304 // https://github.com/mozilla/addons-linter/pull/892
  }
}

if (devBuild) {
  commonConfig.devtool = 'source-map'
}

/**
 * background page bundle (with heavy dependencies)
 * @type {import('@rspack/core').Configuration}
 */
const bgConfig = merge(commonConfig, {
  name: 'background',
  target: 'webworker',
  entry: {
    backgroundPage: './add-on/src/background/background.js'
  },
  output: {
    globalObject: 'globalThis'
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        defaultVendors: false,
        default: false,
        ipfs: {
          name: 'ipfs',
          priority: 10,
          enforce: true,
          // Include js-kubo-rpc-client
          test: /\/node_modules\/kubo-rpc-client\//
        }
      }
    }
  }
})

/**
 * background page bundle (with heavy dependencies)
 * @type {import('@rspack/core').Configuration}
 */
const bgFirefoxConfig = merge(commonConfig, {
  name: 'background-firefox',
  entry: {
    backgroundPage: './add-on/src/background/background.js'
  },
  output: {
    filename: '[name].firefox.bundle.js'
  }
})

/**
 * user interface pages with shared common libraries
 * @type {import('@rspack/core').Configuration}
 */
const uiConfig = merge(commonConfig, {
  name: 'ui',
  entry: {
    browserAction: './add-on/src/popup/browser-action/index.js',
    importPage: './add-on/src/popup/quick-import.js',
    optionsPage: './add-on/src/options/options.js',
    recoveryPage: './add-on/src/recovery/recovery.js',
    welcomePage: './add-on/src/landing-pages/welcome/index.js',
    requestPermissionsPage: './add-on/src/landing-pages/permissions/request.js'
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        defaultVendors: false,
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

/**
 * content scripts injected into tabs
 * @type {import('@rspack/core').Configuration}
 */
const contentScriptsConfig = merge(commonConfig, {
  name: 'contentScripts',
  entry: {
    linkifyContentScript: './add-on/src/contentScripts/linkifyDOM.js'
  }
})

const config = [
  bgConfig,
  bgFirefoxConfig,
  uiConfig,
  contentScriptsConfig
]

export default config
