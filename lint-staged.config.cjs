module.exports = {
  '*.{ts,tsx,js,jsx}': ['node configs/oxlint/lint-staged.cjs', 'prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};
