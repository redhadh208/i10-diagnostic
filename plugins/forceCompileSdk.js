const { withProjectBuildGradle } = require('@expo/config-plugins');

const forceCompileSdk = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('forceCompileSdk34')) {
      config.modResults.contents = config.modResults.contents.replace(
        /allprojects\s*\{/,
        `allprojects {
    // forceCompileSdk34 - Force compileSdkVersion for all modules
    afterEvaluate { project ->
        if (project.hasProperty('android')) {
            project.android {
                compileSdkVersion 34
            }
        }
    }`
      );
    }
    return config;
  });
};

module.exports = forceCompileSdk;
