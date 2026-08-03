// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // "@/..." is resolved by babel-plugin-module-resolver (see babel.config.js)
      // and by Metro, but the eslint import resolver does not read that config,
      // so every aliased import reads as unresolved. Metro still fails the build
      // on a genuinely bad path.
      'import/no-unresolved': ['error', { ignore: ['^@/'] }],
    },
  },
]);
