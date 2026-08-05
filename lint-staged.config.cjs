module.exports = {
  '*.{ts,tsx,js,jsx}': ['oxlint --deny-warnings', 'prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write']
};
