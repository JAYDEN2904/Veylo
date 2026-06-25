#!/bin/bash

# CocoaPods requires UTF-8; without this, `pod install` fails on some macOS setups.
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

ulimit -n 8192 2>/dev/null || true

exec npx expo run:ios "$@"
