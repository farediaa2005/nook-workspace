// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      // Unused variables are errors; a leading underscore marks an intentionally unused one.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      // `catch {}` is used on purpose around storage access (private mode, quota).
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Tracked for the typing / API-contract refactor; kept visible as warnings.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Renaming outputs like (close) touches every template using them — refactor task.
      '@angular-eslint/no-output-native': 'warn',
      // Style-only: "let x = default" later overwritten in every branch.
      'no-useless-assignment': 'warn',
      // Background requests intentionally ignore errors with `error: () => {}`.
      '@typescript-eslint/no-empty-function': 'warn',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      // Accessibility backlog (labels, keyboard handlers, focus) — warnings until the a11y pass.
      '@angular-eslint/template/label-has-associated-control': 'warn',
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/interactive-supports-focus': 'warn',
      '@angular-eslint/template/no-autofocus': 'warn',
    },
  },
]);
