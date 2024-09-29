// @ts-check

import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import jsdoc from 'eslint-plugin-jsdoc';
import jest from 'eslint-plugin-jest';
import prettierConfigRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  {
    ignores: ['lib/'],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.[jt]s'],
    languageOptions: {ecmaVersion: 2022},
    rules: {
      'no-undef': 'error',
      'no-var': 'error',
    },
  },
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ['eslint.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        sourceType: 'module',
        project: true,
      },
    },
    rules: {
      '@typescript-eslint/no-inferrable-types': 'off',
    },
  },
  {
    files: ['**/*.ts'],
    ...jsdoc.configs['flat/recommended-typescript'],
  },
  {
    files: ['**/*.ts'],
    plugins: {jsdoc},
    settings: {
      jsdoc: {mode: 'typescript'},
    },
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          checkConstructors: false,
          contexts: ['MethodDefinition', 'FunctionDeclaration'],
        },
      ],
      'jsdoc/require-param': [
        'error',
        {
          contexts: [
            'FunctionExpression',
            'TSFunctionExpression',
            'FunctionDeclaration',
            'TSFunctionDeclaration',
            'MethodSignature',
            'TSMethodSignature',
            'ArrowFunctionExpression',
            'TSArrowFunctionExpression',
          ],
        },
      ],
      'jsdoc/check-syntax': 'error',
      'jsdoc/newline-after-description': 'off',
      'jsdoc/check-types': 'off',
      'jsdoc/require-returns': 'off',
      'jsdoc/require-returns-description': 'off',
      'jsdoc/require-param-type': 'off',
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      'jsdoc/require-jsdoc': 'off',
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: {...globals.node},
    },
  },
  {
    files: ['**/*.test.ts'],
    ...jest.configs['flat/recommended'],
  },
  {
    files: ['**/*.test.ts'],
    languageOptions: {
      globals: {...globals.jest},
    },
  },
  prettierConfigRecommended
);
