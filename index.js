#!/usr/bin/env node

'use strict';

const install = require('./lib/index.cjs.js');

var chalk = require('chalk');

var currentNodeVersion = process.versions.node;
var semver = currentNodeVersion.split('.');
var major = semver[0];

if (major < 8) {
  console.error(
    chalk.red(
      'You are running Node ' +
        currentNodeVersion +
        '.\n' +
        '@pancodex/firebase-api requires Node 16 or higher. \n' +
        'Please update your version of Node.'
    )
  );
  process.exit(1);
}

require('./lib/index.cjs');
