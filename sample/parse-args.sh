#!/usr/bin/env shellscript-ts

/// <reference path="node.d.ts" />

var options = require('optimist')
    .usage('Sample script for shellscript-ts.\nUsage: $0 [options] URL')
    // --help
    .describe('h', 'Print this message')
    .alias('h', 'help')
    .default('h', false)
    .boolean(['h']);

class ParseArgs {

  execute(): void {
    var argv = options.argv;

    if (argv.h) {
      this.options.showHelp();
      process.exit(1);
    }

    console.log("argv=", argv);
  }
}
new ParseArgs().execute();
