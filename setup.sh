#!/bin/bash
# Setup script to make 'npx expo start' work without EMFILE errors

echo "Setting up Expo development environment..."
echo ""

# Check if ulimit is already set high enough
CURRENT_LIMIT=$(ulimit -n)
if [ "$CURRENT_LIMIT" -lt 8192 ]; then
  echo "Current file descriptor limit: $CURRENT_LIMIT"
  echo "Setting to 8192..."
  ulimit -n 8192
  echo "✓ File descriptor limit set to 8192"
else
  echo "✓ File descriptor limit is already sufficient: $CURRENT_LIMIT"
fi

echo ""
echo "You can now use: npx expo start"
echo ""
echo "To make this permanent, add this to your ~/.zshrc:"
echo "  ulimit -n 8192"
echo ""
echo "Or run: echo 'ulimit -n 8192' >> ~/.zshrc && source ~/.zshrc"












