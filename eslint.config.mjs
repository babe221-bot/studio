import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**', 'backend/**'],
  },
  js.configs.recommended,
  {
    plugins: {
      '@next/next': nextPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      'prettier/prettier': 'error',
      'no-unused-vars': 'warn',
    },
  },
];
