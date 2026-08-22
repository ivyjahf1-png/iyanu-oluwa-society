const { getDefaultConfig } = require('expo/metro-config'); // Expo's metro config helper (resolves @expo/metro-config)

const config = getDefaultConfig(__dirname);

// Ensure Metro can resolve TypeScript and CJS modules (e.g. react-native-gesture-handler ships .ts / .tsx sources)
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx', 'cjs'];

module.exports = config;