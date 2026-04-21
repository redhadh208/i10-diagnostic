const { withProjectBuildGradle } = require('@expo/config-plugins');

const withAndroidSdkVersion = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('compileSdkVersion 34')) {
      config.modResults.contents = config.modResults.contents.replace(
        /compileSdkVersion\s+=\s+\d+/,
        'compileSdkVersion = 34'
      );
      config.modResults.contents = config.modResults.contents.replace(
        /targetSdkVersion\s+=\s+\d+/,
        'targetSdkVersion = 34'
      );
    }
    return config;
  });
};

module.exports = withAndroidSdkVersion;