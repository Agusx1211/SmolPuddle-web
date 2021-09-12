/* eslint-disable */
const path = require('path')
const fs = require('fs')
const webpack = require('webpack')
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const AssetsByTypePlugin = require('webpack-assets-by-type-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')
const paths = require('./paths')

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'production'
process.env.NODE_ENV = 'production'

const main = ['whatwg-fetch']

// const vendor = [
//   'core-js/shim',
//   'global',
//   'history',
//   'mobx',
//   'mobx-little-router',
//   'mobx-little-router-react',
//   'react',
//   'react-dom',
//   'react-helmet',
//   'lodash',
//   'ethers'
// ]

const webpackBuildConfig = {
  module: {
    rules: [
      {
        test: /\.(js|mjs|jsx|ts|tsx)$/,
        include: [paths.appSrc],
        loader: require.resolve('babel-loader'),
        options: {
          customize: require.resolve('babel-preset-react-app/webpack-overrides'),
          presets: [
            [
              '@babel/preset-env',
              {
                targets: '> 0.25%, not dead',
                forceAllTransforms: true
              }
            ],
            '@babel/preset-react',
            '@babel/preset-typescript'
          ],
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
            ]
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
  }
}

const webappConfig = {
  context: process.cwd(), // to automatically find tsconfig.json
  target: ['web', 'es5'],
  entry: {
    main: [...main, './src/index.tsx'] //,
    // 'vendor': vendor
  },
  output: {
    path: path.join(process.cwd(), 'dist'),
    publicPath: '/',
    filename: '[name]-[chunkhash].js',
    chunkFilename: 'bundle.[name]-[chunkhash].js'
  },
  optimization: {
    moduleIds: 'named',
    chunkIds: 'named',
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: 4,
        terserOptions: {
          ecma: 5,
          ie8: false,
          safari10: false,
          mangle: false,
          compress: {
            dead_code: true,
            unused: true
          },
          output: {
            comments: false,
            beautify: false
          }
        }
      })
    ],
    runtimeChunk: false,
    concatenateModules: true // ModuleConcatenationPlugin
  },
  plugins: [
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
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.GITCOMMIT': JSON.stringify(process.env.GITCOMMIT)
    }),
    new HtmlWebpackPlugin({
      inject: 'body',
      scriptLoading: 'defer',
      template: 'public/index.html',
      templateParameters: {
        gitcommit: process.env.GITCOMMIT
      }
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer']
    }),
    new NodePolyfillPlugin(),
    // new AssetsByTypePlugin({
    //   path: path.join(process.cwd(), 'dist/assets.json')
    // }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: '.stats/index.html'
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'public',
          to: '.',
          globOptions: {
            ignore: ['**/index.html', '**/login/redirect.html']
          }
        }
      ]
    })
  ],
  ...webpackBuildConfig
}


module.exports = [webappConfig]
