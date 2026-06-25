module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // babel-preset-expo already appends react-native-worklets/plugin (or reanimated/plugin)
    // last — do not duplicate it here.
    plugins: ['nativewind/babel'],
  };
};
