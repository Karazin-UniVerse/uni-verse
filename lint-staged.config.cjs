module.exports = {
  '*.{ts,tsx,js,jsx}': ['node configs/oxlint/lint-staged.cjs', 'prettier --write'],
  '*.{css,scss}': ['stylelint --fix', 'prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};
