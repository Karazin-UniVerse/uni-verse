#!/bin/sh
# Minimal husky shim for environments where pnpm dlx husky isn't run
# This file exists to prevent husky install errors in CI if husky isn't installed locally.
# In local dev, run: pnpm -w dlx husky@8 install .husky

# noop
