#!/bin/bash

rm -rf bin
mkdir bin

rm -rf build
mkdir build

npm install --silent

npm run babel . --  --ignore node_modules --out-dir build

cp package.json build/package.json

./node_modules/.bin/pkg ./build/package.json --targets node12-win-x64 --output bin/geofeed-finder-win-x64 --loglevel=error

./node_modules/.bin/pkg ./build/package.json --targets node12-linux-x64 --output bin/geofeed-finder-linux-x64 --loglevel=error

./node_modules/.bin/pkg ./build/package.json --targets node12-macos-x64 --output bin/geofeed-finder-macos-x64 --loglevel=error

echo "--> Geofeed finder compiled in bin/"

rm -rf build
