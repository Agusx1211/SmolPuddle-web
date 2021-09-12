/* eslint-disable */
const path = require('path')
const webpack = require('webpack')
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin')
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const paths = require('./paths')

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'development'
process.env.NODE_ENV = 'development'

let webpackDevServerURL = 'http://0.0.0.0:3333'
let dist = process.env.DIST
if (!dist || dist === '') {
  dist = 'local'
}

const appConfig = require(`../config.${dist}.json`)

if (dist == 'compose') {
  webpackDevServerURL = 'https://local-wallet.0xhorizon.net'
}

// use same local development values as game client/server
process.env.GITCOMMIT = 'dev'

// if (dist === 'local') {
//   process.env.GITCOMMIT = require('child_process').execSync(
//     'git log -1 --date=iso --pretty=format:%H'
//   )
// }

const main = [
  // `webpack-dev-server/client?${webpackDevServerURL}`,
  // 'webpack/hot/only-dev-server',
  'whatwg-fetch',
  './src/index.tsx'
]
// const vendor = shared.vendorEntry({
//   mainModules: main,
//   modulesToExclude: ['']
// })

const webpackBuildConfig = {
  module: {
    rules: [
      {
        test: /\.(js|mjs|jsx|ts|tsx)$/,
        include: [paths.appSrc],
        exclude: /node_modules/,
        loader: require.resolve('babel-loader'),
        options: {
          customize: require.resolve('babel-preset-react-app/webpack-overrides'),
          presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
          plugins: [
            require.resolve('@babel/plugin-syntax-dynamic-import'),
            [require.resolve('@babel/plugin-proposal-private-property-in-object'), { loose: true }],
            [require.resolve('@babel/plugin-proposal-class-properties'), { loose: true }],
            [require.resolve('@babel/plugin-proposal-private-methods'), { loose: true }],
            [
              require.resolve('babel-plugin-named-asset-import'),
              {
                loaderMap: {
                  svg: {
                    ReactComponent: '@svgr/webpack?-svgo,+titleProp,+ref![path]'
                  }
                }
              }
            ],
            require.resolve('@babel/plugin-transform-runtime'),
            [
              require.resolve('@emotion/babel-plugin'),
              {
                importMap: {
                  '~/style': {
                    styled: {
                      canonicalImport: ['@emotion/styled', 'default']
                    },
                    css: {
                      canonicalImport: ['@emotion/react', 'css']
                    }
                  }
                }
              }
            ],
            require.resolve('react-refresh/babel')
          ],
          // This is a feature of `babel-loader` for webpack (not Babel itself).
          // It enables caching results in ./node_modules/.cache/babel-loader/
          // directory for faster rebuilds.
          // cacheDirectory: true,
          // See #6846 for context on why cacheCompression is disabled
          cacheCompression: false,
          compact: false
        }
      },
      {
        test: /\.(jpe?g|png|webp|gif|svg|otf)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192000
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    modules: ['node_modules', paths.appNodeModules],
    extensions: ['.ts', '.tsx', '.js', '.png', '.jpg', '.d.ts'],
    alias: {},
    plugins: [new TsconfigPathsPlugin()]

    // loads of fallback warnings because of ethers poor dist setup.
    // however, new ethers version will fix their build tools and we
    // can clean up the below.
    // fallback: {
    //   fs: false,
    //   net: false,
    //   child_process: false,
    //   os: false,
    //   https: false,
    //   http: false,
    //   crypto: false,
    //   stream: false,
    //   util: false,
    //   zlib: false
    // }
  }
}

const webappConfig = {
  context: process.cwd(), // to automatically find tsconfig.json
  target: 'web',
  entry: {
    main: main
    // vendor: vendor
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    chunkFilename: '[name].js',
    publicPath: '/'
  },
  optimization: {
    moduleIds: 'named',
    chunkIds: 'named'
  },
  plugins: [
    new ReactRefreshWebpackPlugin(),
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        diagnosticOptions: { syntactic: true }
      },
      eslint: {
        files: './src/**/*.{ts,tsx}'
      },
      formatter: 'codeframe'
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'),
      'process.env.GITCOMMIT': JSON.stringify(process.env.GITCOMMIT)
    }),
    new HtmlWebpackPlugin({
      inject: true,
      template: 'public/index.html',
      templateParameters: {
        gitcommit: ''
      }
    }),
    // Create the app config script
    new HtmlWebpackPlugin({
      inject: false,
      templateContent: 'window.APP_CONFIG = ' + JSON.stringify(appConfig),
      filename: 'config.env.js'
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer']
    }),
    new NodePolyfillPlugin()
    // new BundleAnalyzerPlugin()
  ],
  devtool: 'inline-source-map',
  devServer: {
    host: '0.0.0.0',
    port: 3333,
    open: false,
    hot: true,
    historyApiFallback: true,
    stats: 'errors-only',
    disableHostCheck: true,
    contentBase: path.resolve(process.cwd(), 'public'),
    publicPath: '/'
  },
  ...webpackBuildConfig
}

module.exports = [webappConfig]
