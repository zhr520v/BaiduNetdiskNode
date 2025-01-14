import pluginVue from 'eslint-plugin-vue'
import tsESLint from 'typescript-eslint'

export default tsESLint.config(
  ...tsESLint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    languageOptions: {
      parserOptions: {
        parser: tsESLint.parser,
        extraFileExtensions: ['.vue'],
      },
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
    },
  },
  {
    files: ['**/*.js', '**/*.cjs', '**/*.ts', '**/*.tsx', '**/*.vue'],
    rules: {
      eqeqeq: 'error',
      'newline-before-return': 'error',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',

      '@typescript-eslint/no-explicit-any': 'off',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          vars: 'all',
          args: 'after-used',
        },
      ],

      'padding-line-between-statements': [
        'error',
        {
          blankLine: 'always',
          prev: '*',
          next: 'block',
        },
        {
          blankLine: 'always',
          prev: 'block',
          next: '*',
        },
        {
          blankLine: 'always',
          prev: '*',
          next: 'block-like',
        },
        {
          blankLine: 'always',
          prev: 'block-like',
          next: '*',
        },
      ],

      'lines-between-class-members': [
        'error',
        {
          enforce: [
            {
              blankLine: 'always',
              prev: '*',
              next: 'method',
            },
            {
              blankLine: 'always',
              prev: 'method',
              next: '*',
            },
          ],
        },
      ],
    },
  }
)
