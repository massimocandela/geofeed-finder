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

# The pkg tool considers macos-arm64 to be an experimental target (see https://github.com/vercel/pkg). 
# Due to the mandatory code signing requirement, before the executable is distributed to end users, it must be signed.
# Otherwise, it will be immediately killed by kernel on launch.
# An ad-hoc signature is sufficient.
# To do that, run pkg on a Mac, or transfer the executable to a Mac
# and run "codesign --sign - <executable>"
# or (if you use Linux) install "ldid" utility to PATH and then run pkg again 
# ./node_modules/.bin/pkg ./package.json --targets node18-macos-arm64 --output bin/geofeed-finder-macos-arm64 --loglevel=error

echo "--> Geofeed finder compiled in bin/"

