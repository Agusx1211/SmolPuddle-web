/* eslint-disable */
'use strict'

const path = require('path')
const fs = require('fs')
const getPublicUrlOrPath = require('react-dev-utils/getPublicUrlOrPath')
const isES5 = require('are-you-es5')

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebook/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd())
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath)

// We use `PUBLIC_URL` environment variable or "homepage" field to infer
// "public path" at which the app is served.
// webpack needs to know it to put the right <script> hrefs into HTML even in
// single-page apps that may serve index.html for nested URLs like /todos/42.
// We can't use a relative path in HTML because we don't want to load something
// like /todos/42/static/js/bundle.7289d.js. We have to know the root.
const publicUrlOrPath = getPublicUrlOrPath(
  process.env.NODE_ENV === 'development',
  require(resolveApp('package.json')).homepage,
  process.env.PUBLIC_URL,
)

const moduleFileExtensions = [
  'web.mjs',
  'mjs',
  'web.js',
  'js',
  'web.ts',
  'ts',
  'web.tsx',
  'tsx',
  'json',
  'web.jsx',
  'jsx',
  'd.ts'
]

// Resolve file paths in the same order as webpack
const resolveModule = (resolveFn, filePath) => {
  const extension = moduleFileExtensions.find((extension) => fs.existsSync(resolveFn(`${filePath}.${extension}`)));
  if (extension) {
    return resolveFn(`${filePath}.${extension}`)
  }
  return resolveFn(`${filePath}.js`)
}

const resolveES6Modules = () => {
  const result = isES5.checkModules({
    path: '', // Automatically find up package.json from cwd
    checkAllNodeModules: true,
    ignoreBabelAndWebpackPackages: true
  })

  // Returns the regexp including all es6 modules
  // TODO: include specific path resolution, which may be faster.
  return isES5.buildIncludeRegexp(result.es6Modules)
}

// config after eject: we're in ./config/
module.exports = {
  appSrc: resolveApp('src'),

  // dotenv: resolveApp('.env'),
  // appPath: resolveApp('.'),
  // appBuild: resolveApp('build'),
  // appPublic: resolveApp('public'),
  // appHtml: resolveApp('public/index.html'),
  // appIndexJs: resolveModule(resolveApp, 'src/index'),
  // appPackageJson: resolveApp('package.json'),
  // appSrc: resolveApp('src'),
  appNodeModules: resolveApp('node_modules'),
  // publicUrlOrPath,
  // packagesSrc: resolveApp('../packages'),
  // sharedSrc: resolveApp('../../../shared/packages'),

  appES6NodeModules: resolveES6Modules()
}

module.exports.moduleFileExtensions = moduleFileExtensions
