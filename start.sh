#!/bin/bash
export WATCHMAN_DISABLE=1
# Increase file descriptor limit to prevent EMFILE errors
ulimit -n 8192
npx expo start "$@"














