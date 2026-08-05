module.exports = {
  root: true,
  env: { node: true, browser: true, es2024: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2024, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    'no-console': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn'
  }
};
