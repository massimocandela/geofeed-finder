#!/bin/bash

rm -rf bin
mkdir bin

rm -rf dist
mkdir dist

npm ci --silent

npm run compile

./node_modules/.bin/pkg ./package.json --targets node14-win-x64 --output bin/geofeed-finder-win-x64 --loglevel=error

./node_modules/.bin/pkg ./package.json --targets node14-linux-x64 --output bin/geofeed-finder-linux-x64 --loglevel=error

./node_modules/.bin/pkg ./package.json --targets node14-macos-x64 --output bin/geofeed-finder-macos-x64 --loglevel=error

echo "--> Geofeed finder compiled in bin/"

