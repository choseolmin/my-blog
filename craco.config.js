const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (config) => {
      config.resolve.fallback = {
        url: require.resolve('url/'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        stream: require.resolve('stream-browserify'),
        path: require.resolve('path-browserify'),
        assert: require.resolve('assert/'),
        buffer: require.resolve('buffer/'),
        process: require.resolve('process/browser'),
        fs: false
      };
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );
      return config;
    },
  },
};
