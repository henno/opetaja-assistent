import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'

export default [
  {
    languageOptions: { globals: globals.browser }, rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }]
    }
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
]
