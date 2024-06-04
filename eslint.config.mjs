import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    languageOptions: {
      globals: globals.browser,
      parser: tsParser, // Use the imported parser module
      parserOptions: {
        project: './tsconfig.json' // Ensure this points to your actual tsconfig.json
      }
    },
    rules: {
      '@typescript-eslint/no-floating-promises': ['error'],
      // 'no-console': ['error', { allow: ['warn', 'error'] }]
    }

  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];