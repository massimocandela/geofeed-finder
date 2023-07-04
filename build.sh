#!/bin/bash

rm -rf bin
mkdir bin

rm -rf dist
mkdir dist

npm ci --silent

npm run compile

./node_modules/.bin/pkg ./package.json --targets node18-win-x64 --output bin/geofeed-finder-win-x64 --loglevel=error

./node_modules/.bin/pkg ./package.json --targets node18-linux-x64 --output bin/geofeed-finder-linux-x64 --loglevel=error

./node_modules/.bin/pkg ./package.json --targets node18-linux-arm64 --output bin/geofeed-finder-linux-arm64 --loglevel=error

./node_modules/.bin/pkg ./package.json --targets node18-macos-x64 --output bin/geofeed-finder-macos-x64 --loglevel=error

# The pkg tool considers macos-arm64 to be an experimental target (https://github.com/vercel/pkg). 
# Pkg uses ad-hoc certification to sign the MacOS binary. Use your own certificate or skip entirely using --no-signature  
./node_modules/.bin/pkg ./package.json --targets node18-macos-arm64 --output bin/geofeed-finder-macos-arm64 --loglevel=error

echo "--> Geofeed finder compiled in bin/"

