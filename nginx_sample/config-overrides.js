// config-overrides.js
const webpack = require('webpack');

module.exports = function override(config) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    buffer: require.resolve('buffer/')
  };
  config.plugins = [
    ...(config.plugins || []),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer']
    })
  ];
  return config;
};

module.exports.devServer = function (configFunction) {
  return function (proxy, allowedHost) {
    const config = configFunction(proxy, allowedHost);

    // allowedHostsを追加
    config.allowedHosts = ["web.local.example-dev.com"]; // すべてのホストを許可
    // または特定のホストのみ許可
    // config.allowedHosts = ['my.local.dev', 'example.com'];

    return config;
  };
};