#!/bin/bash

# Exit on error
set -e

# Enable debug output
set -x

# Ensure we're in the extension directory
cd "$(dirname "$0")/.." || exit 1
pwd

echo "Installing Playwright browser..."
npx playwright install chromium

# Set environment variables before build
export VITE_ENABLE_MODEL_SELECTION=false

echo "Building extension..."
npm run build

echo "Running screenshot tests..."
# Run the screenshot test with the dedicated config
DEBUG=pw:api npx playwright test --config=screenshots/screenshots.config.ts --project=screenshots

echo "Screenshots generated successfully in screenshots/output/"
echo "Interaction screenshots generated in screenshots/output/interaction/"
echo "Promotional images generated in screenshots/output/promo/"