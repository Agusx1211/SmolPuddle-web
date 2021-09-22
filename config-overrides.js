/* config-overrides.js */

module.exports = function override(config, env) {
  // Keep class names, used by the stores
  config.optimization.minimizer[0].options.terserOptions.keep_classnames = true
  config.optimization.minimizer[0].options.terserOptions.keep_fnames = true

  // Note: It's important that the "worker-loader" gets defined BEFORE the TypeScript loader!
  config.module.rules.unshift({
    test: /\.worker\.ts$/,
    use: {
      loader: 'worker-loader',
      options: {
        // Use directory structure & typical names of chunks produces by "react-scripts"
        filename: 'static/js/[name].[contenthash:8].js',
      },
    },
  })

  return config
}
