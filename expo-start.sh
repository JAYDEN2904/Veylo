#!/bin/bash

# CocoaPods (used by `expo run:ios`) requires UTF-8 on some macOS setups.
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Increase file descriptor limit for macOS (if needed)
ulimit -n 8192 2>/dev/null || true

# This project uses expo-dev-client — Expo Go is not supported.
exec npx expo start --dev-client "$@"












