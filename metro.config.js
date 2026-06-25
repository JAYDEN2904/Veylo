const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

config.resolver = config.resolver || {};

// react-native-reanimated's build script requires semver@7 subpaths; root often has semver@6.
// Metro must resolve into react-native-reanimated/node_modules/semver (not blocked — see blockList below).
const reanimatedPackageRoot = path.dirname(
  require.resolve('react-native-reanimated/package.json', { paths: [__dirname] })
);

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === 'semver/functions/satisfies' ||
    moduleName === 'semver/functions/prerelease'
  ) {
    try {
      return {
        type: 'sourceFile',
        filePath: require.resolve(moduleName, { paths: [reanimatedPackageRoot] }),
      };
    } catch {
      // fall through to default resolver
    }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Only watch the src directory and root files to minimize file handles
const srcPath = path.resolve(__dirname, 'src');
const rootFiles = ['App.tsx', 'package.json', 'tsconfig.json', 'babel.config.js', 'tailwind.config.js'];

// Create watch folders array - only include src if it exists
const watchFolders = [path.resolve(__dirname)];
if (fs.existsSync(srcPath)) {
  watchFolders.push(srcPath);
}

config.watchFolders = watchFolders;

// Configure watcher with very aggressive optimizations for NodeWatcher
config.watcher = {
  ...config.watcher,
  // Health check configuration with longer intervals
  healthCheck: {
    enabled: true,
    interval: 10000, // Much longer interval to reduce overhead
    timeout: 15000,
  },
};

// Aggressively block ALL unnecessary directories from being watched
// This is critical for NodeWatcher to avoid EMFILE errors
const existingBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : config.resolver.blockList
    ? [config.resolver.blockList]
    : [];

config.resolver.blockList = [
  ...existingBlockList,
  // Block nested node_modules (reduces watchers) but keep packages Metro must traverse fully
  // (react-native-reanimated → semver@7; expo → @expo/cli, etc.).
  /node_modules\/(?!react-native-reanimated\b|expo\b).*\/node_modules\/.*/,
  // Block noisy hidden dirs — do NOT block entire `.expo/` (Metro needs `.expo/metro/*` polyfills).
  /\.git\/.*/,
  /\.expo\/cache\/.*/,
  /\.expo-shared\/.*/,
  /\.idea\/.*/,
  /\.vscode\/.*/,
  /\.DS_Store/,

  // Backend monorepo folder — Deno edge sources not needed by Metro
  /veylo_backend\/.*/,

  // Block build and dist directories

  /\.next\/.*/,
  /\.cache\/.*/,
  /coverage\/.*/,
  /\.nyc_output\/.*/,
  // Block documentation files that don't need watching
  /.*\.md$/,
  /.*\.txt$/,
  // Block shell scripts
  /.*\.sh$/,
  // Block lock files
  /package-lock\.json/,
  /yarn\.lock/,
  /pnpm-lock\.yaml/,
];

// Optimize transformer to reduce file operations
config.transformer = {
  ...config.transformer,
  // Reduce file system operations
  enableBabelRCLookup: false,
  enableBabelRuntime: false,
};

// Reduce the number of platforms Metro watches
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;














