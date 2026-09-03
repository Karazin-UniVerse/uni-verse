module.exports = {
  '*.{ts,tsx,js,jsx}': ['oxlint --fix --deny-warnings', 'prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};
