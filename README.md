# Electron OTE

This is the source code for an electron wrapper around the online transcription editor (OTE) developed for the MUYA project. 

The OTE code is included as a submodule.

This is the source code used to create packaged/zipped versions that run on windows and mac (and linux if required).

## Requirements

* node.js 
* node package manager (npm)
* jq (https://stedolan.github.io/jq/) optional but if not used version number must be manually altered in the package.json file before running .sh file

The code in the repository just distributes the application as zip files not as proper installers for each OS. 

## Installation example for Ubuntu

First ensure you have the required packages

`sudo apt install nodejs`

`sudo apt install npm`

`sudo apt install jq`

Clone this repository

Move into the cloned directory and initialise the submodule

`git submodule init`

`git submodule update`

Get the required javascript packages using npm

`npm install electron --save-dev`

`npm install electron-packager --save-dev`

`npm install jquery@^3.5.1 --save`

`npm install codemirror --save`

## To run

To check the installation and run the electron OTE locally you can run it on the command line with the following command

`./node_modules/.bin/electron .`

## To package

To package for windows and mac

`./make_MUYA_electron_packages.sh [version number]`

The packaged versions will be available in the directory `release-builds`. 

The zip versions will be created as siblings of the cloned directory.
