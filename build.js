const rewire = require('rewire')
const defaults = rewire('react-scripts/scripts/build.js')
const config = defaults.__get__('config')

// Do not mangle class names in production
config.optimization.minimizer[0].options.terserOptions.keep_classnames = true
config.optimization.minimizer[0].options.terserOptions.keep_fnames = true
