#!/bin/bash

# to run call script with a single argument which is the version number of the new electron app

#try to replace the version number in the package.json file (supplied on cl)
{
  jq ".version = \"$1\"" package.json > tmp.$$.json && mv tmp.$$.json package.json
} || {
  echo "Cannot change version number in package.json due to missing library 'jq'. The version number can be changed manually in the file."
}

#package for all three OSs (packages will be in release-builds)
npm run package-mac
npm run package-win
npm run package-linux

cd release-builds

#zip the windows version
zip -r muya-ote-win-$1.zip muya-ote-win32-ia32
mv muya-ote-win-$1.zip ../../

#zip the mac version
zip -r MUYA-OTE-darwin-$1.zip MUYA\ OTE-darwin-x64
mv MUYA-OTE-darwin-$1.zip ../../
