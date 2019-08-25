module.exports = {
  env: {
    browser: true,
    'jest/globals': true,
    jasmine: true,
    'webdriverio/wdio': true
  },
  extends: [
    'plugin:jsx-a11y/recommended',
    'plugin:react-perf/recommended',
    'plugin:react/recommended',
    'standard',
    'prettier',
    'prettier/react',
    'prettier/standard',
    'prettier/@typescript-eslint',
    'plugin:jasmine/recommended'
  ],
  globals: {
    USE_LOCAL_PROXY: false
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        'no-unused-vars': 'off',
        'react/prop-types': 'off'
      }
    },
    {
      files: ['**/*.jsx', '**/*.spec.*', '**/*.stories.*'],
      rules: {
        'react-perf/jsx-no-new-array-as-prop': 'off',
        'react-perf/jsx-no-new-function-as-prop': 'off',
        'react-perf/jsx-no-new-object-as-prop': 'off'
      }
    }
  ],
  parser: '@typescript-eslint/parser',
  plugins: [
    //'filenames',
    'promise',
    'react',
    'react-perf',
    'jest',
    'standard',
    'prettier',
    'jasmine',
    'webdriverio'
  ],
  rules: {
    // Filenames should match the exported item
    //'filenames/match-exported': ['warn', ['kebab']],
    // snake-case. You can start with a _ if you need to. Dots are ok too.
    //'filenames/match-regex': ['error', '^_?[a-z0-9\\-\\.]+$'],

    'no-alert': 'error',
    'no-console': [
      'error',
      {
        allow: ['info', 'warn', 'debug', 'error', 'assert']
      }
    ],
    'prefer-const': 'error',
    'react-perf/jsx-no-new-array-as-prop': 'warn',
    'react-perf/jsx-no-new-function-as-prop': 'warn',
    'react-perf/jsx-no-new-object-as-prop': 'warn',
    'react/jsx-filename-extension': ['error', { extensions: ['.jsx', '.tsx'] }],
    'react/jsx-sort-props': 'warn',
    'sort-imports': 'warn',
    'sort-keys': 'warn',
    'jasmine/no-spec-dupes': ['error', 'branch']
  },
  settings: {
    react: {
      version: '16'
    }
  }
}
