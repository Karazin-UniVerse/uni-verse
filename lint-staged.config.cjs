module.exports = {
  '*.{ts,tsx,js,jsx}': ['node configs/oxlint/lint-staged.cjs', 'prettier --write'],
  '*.{scss,css}': ['stylelint --fix', 'prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};
