// Babel 설정. babel-preset-expo 가 Reanimated 4 용 `react-native-worklets/plugin` 을 자동으로 붙입니다.
// VisionCamera v4 의 프레임 프로세서('worklet' 함수)는 별도로 react-native-worklets-core 플러그인이 필요합니다.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets-core/plugin'],
  };
};
