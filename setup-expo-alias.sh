#!/bin/bash
# This script sets up a shell alias to make 'npx expo start' work with proper file limits
# Run: source setup-expo-alias.sh

# Create an alias that sets ulimit before running expo
alias expo-start='ulimit -n 8192 && npx expo start'

echo "✓ Alias 'expo-start' created. You can now use:"
echo "  expo-start"
echo "  expo-start --ios"
echo "  expo-start --android"
echo "  expo-start --web"
echo ""
echo "To make this permanent, add this line to your ~/.zshrc:"
echo "  alias expo-start='ulimit -n 8192 && npx expo start'"












