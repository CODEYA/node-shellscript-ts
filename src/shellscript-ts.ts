/// <reference path="../lib/node-0.11.d.ts" />
/// <reference path="../node_modules/typescript/bin/typescript.d.ts" />

import crypto = require('crypto');
import fs     = require("fs");
import path   = require("path");
import ts     = require("typescript");
import vm     = require('vm');

export module ShellScriptTs {

  /**
   * Main class of ShellScriptTs
   */
  export class ShellScriptTs {

    private compiler = new TsCompiler();
    private cache = new Cache('/tmp/shellscript-ts/cache');
    private options = require('optimist')
        .usage('A nodejs module for creating shellscript in TypeScript.\nUsage: $0 [options] file')
        // --no-cache
        .alias('n', 'no-cache')
        .describe('n', 'Do not use cached JavaScript.')
        .default('n', false)
        // --verbose
        .alias('v', 'verbose')
        .describe('v', 'Shows details about the process.')
        .default('v', false)
        // --help
        .alias('h', 'help')
        .describe('h', 'Print this message')
        .default('h', false)
        // --no-cache / --verbose / --help are boolean
        .boolean(['n','v', 'h'])
        // non-option arguments
        .demand(1);

    execute(): void {
      Console.log('ShellScriptTs#execute : parsing args...');
      var tsPath = this.parseArgs();

      Console.log('ShellScriptTs#execute : resolving js...');
      var jsBody = this.resolveJs(tsPath);

      Console.log('ShellScriptTs#execute : executing js...');
      this.executeJs(jsBody);
    }

    /**
     * Parses an arguments.
     */
    private parseArgs():string {
      var argv = this.options.argv;

      if (argv.h) {
        this.options.showHelp();
        process.exit(1);
      }
      if (argv._.length != 1) {
        this.options.showHelp();
        process.exit(1);
      }

      Console.setEnabled(argv.v);
      Console.log('ShellScriptTs#parseArgs : verbose=' + argv.v);

      this.cache.setEnabled(!argv.n);
      Console.log('ShellScriptTs#parseArgs : no-cache=' + argv.n);

      Console.log('ShellScriptTs#parseArgs : script=' + argv._[0]);
      return argv._[0];
    }

    /**
     * Resolves a JavaScript.
     * Tries to fetch a JavaScript from cache,
     * then converts TypeScript to JavaScript if no cached JavaScript found.
     */
    private resolveJs(tsPath:string):string {
      // read TypeScript file
      var scriptBody = null;
      try {
        scriptBody = fs.readFileSync(tsPath, 'utf-8');
      } catch(e) {
        if (e.code !== 'ENOENT') {
          Console.log("ShellScriptTs#resolveJs : failed to read file \"" + tsPath + "\" : " + e);
        } else {
          Console.log("ShellScriptTs#resolveJs : file \"" + tsPath + "\" not found");
        }
        process.exit(1);
      }
      Console.log('ShellScriptTs#resolveJs : scriptBody ---------------------');
      Console.log('\n' + scriptBody);

      // remove shebang
      var tsBody = scriptBody.replace(/^#!.+\n/g, (str) => "");
      Console.log('ShellScriptTs#resolveJs : tsBody -------------------------');
      Console.log('\n' + tsBody);

      // prepare JavaScript
      var jsBody = this.cache.fetch(tsPath, tsBody);
      if(jsBody == null) {
        var tsPathDir = path.dirname(tsPath);
        var tsPathFile = path.basename(tsPath);
        var jsBodies = this.compiler.compile(tsPathDir, tsPathFile, tsBody);
        jsBody = jsBodies[tsPathFile + ".js"].getSource();
        Console.log('ShellScriptTs#resolveJs storing cache');
        this.cache.store(tsPath, tsBody, jsBody);
      }
      Console.log('ShellScriptTs#resolveJs : jsBody -------------------------');
      Console.log('\n' + jsBody);

      return jsBody;
    }

    /**
     * Executes a JavaScript.
     */
    private executeJs(jsBody:string): void {
      Console.log('ShellScriptTs#executeJs : jsBody -------------------------');
      Console.log('\n' + jsBody);

      var contextVars = {console: console,
                         process: process,
                         require: require};
      var context = vm.createContext(contextVars);

      vm.runInContext(jsBody, context);
    }
  }

  /**
   * Console for ShellScript.ts
   */
  class Console {
    static prefix = '[shellscript.ts] ';
    static enabled:boolean;

    /**
     * Sets true if the console enabled.
     */
    static setEnabled(enabled:boolean):void {
      this.enabled = enabled;
    }

    /**
     * Outputs a message to stdout.
     */
    static log(message:string) {
      if(this.enabled) {
        console.log(this.prefix + message);
      }
    }
  }

  /**
   * Cache of JavaScript.
   */
  class Cache {
    private cacheDir:string;
    private enabled:boolean;

    constructor(cacheDir:string) {
      this.cacheDir = cacheDir;

      // create a cache directory.
      try {
        require('mkdirp').sync(this.cacheDir);
      } catch(e) {
        if (e.code !== 'ENOENT') {
          throw e;
        }
      }
    }

    /**
     * Sets true if the cache enabled.
     */
    setEnabled(enabled:boolean):void {
      this.enabled = enabled;
    }

    /**
     * Returns a cached js body, or null if not cached.
     */
    fetch(tsPath:string, tsBody:string):string {
      if(!this.enabled) {
        Console.log("Cache#fetch : fetch skipped.");
        return null;
      }

      var cacheId = this.createCacheId(tsPath, tsBody);
      var cacheFilename = this.cacheDir + "/" + cacheId;
      Console.log("Cache#fetch : cacheFilename=" + cacheFilename);

      try {
        var cache = fs.readFileSync(cacheFilename, 'utf-8');
        Console.log("Cache#fetch : fetched cache");
        return cache;
      } catch(e) {
        if (e.code !== 'ENOENT') {
          throw e;
        }
        Console.log("Cache#fetch : no cache");
        return null;
      }
    }

    /**
     * Stores a js body to cache.
     */
    store(tsPath:string, tsBody:string, jsBody:string):void {
      if(!this.enabled) {
        Console.log("Cache#store : store skipped.");
        return;
      }

      var cacheId = this.createCacheId(tsPath, tsBody);
      var cacheFilename = this.cacheDir + "/" + cacheId;
      Console.log("Cache#store : cacheFilename=" + cacheFilename);

      fs.writeFile(cacheFilename, jsBody);
      Console.log("Cache#store : stored cache");
    }

    /**
     * Creates cache ID.
     */
    private createCacheId(tsPath:string, tsBody:string):string {
      var tsRealPath = fs.realpathSync(tsPath);
      Console.log("Cache#createCacheId : tsRealPath=" + tsRealPath);
      var tsFilename = path.basename(tsRealPath);
      Console.log("Cache#createCacheId : tsFilename=" + tsFilename);

      var tsRealPathHash = crypto.createHash('sha1').update(tsRealPath).digest('hex');
      Console.log("Cache#createCacheId : tsRealPathHash=" + tsRealPathHash);
      var tsBodyHash = crypto.createHash('sha1').update(tsBody).digest('hex');
      Console.log("Cache#createCacheId : tsBodyHash=" + tsBodyHash);

      var cacheId = tsFilename + "." + tsRealPathHash + "." + tsBodyHash;
      Console.log("Cache#createCacheId : cacheId=" + cacheId);
      return cacheId;
    }
  }

  /**
   * TypeScript compiler.
   */
  class TsCompiler {

    /**
     * Compile TypeScript.
     */
    compile(tsPathDir: string, tsPathFile: string, tsBody: string, compilerOptions: ts.CompilerOptions = {}): { [key: string]: CompiledJs; } {
      var self = this;
      var libFilename = "lib.d.ts";
      var libSource = fs.readFileSync(path.join(path.dirname(require.resolve('typescript')), libFilename)).toString();
      var nodeFilename = "node.d.ts";
      var nodeSource = fs.readFileSync("./lib/node-0.11.d.ts").toString();
      var outputs: { [key: string]: CompiledJs; } = {};
      var compilerHost = {
        getSourceFile: function (filename, languageVersion) {
          Console.log("compilerHost#getSourceFile : filename=" + filename);
          Console.log("compilerHost#getSourceFile : languageVersion=" + languageVersion);
          var sourceFile = null;
          if(filename === tsPathFile + ".ts") {
            sourceFile = ts.createSourceFile(filename, tsBody, compilerOptions.target, "0");
          } else if(filename === libFilename) {
            sourceFile = ts.createSourceFile(filename, libSource, compilerOptions.target, "0");
          } else if(filename === nodeFilename) {
            sourceFile = ts.createSourceFile(filename, nodeSource, compilerOptions.target, "0");
          } else {
            // Find a source file in working directory.
            sourceFile = self.createSourceFile(tsPathDir, filename, compilerOptions);
            if(sourceFile === undefined) {
              // Find a source file in shellscript-ts directory.
              sourceFile = self.createSourceFile(process.cwd(), filename, compilerOptions);
            }
          }
          Console.log("compilerHost#getSourceFile : sourceFile=" + sourceFile);
          return sourceFile;
        },
        writeFile: function (name, text, writeByteOrderMark) {
          outputs[name] = new CompiledJs(name, text, writeByteOrderMark);
        },
        getDefaultLibFilename: function() { return libFilename; },
        useCaseSensitiveFileNames: function() { return false; },
        getCanonicalFileName: function (filename) { return filename; },
        getCurrentDirectory: function() { return ""; },
        getNewLine: function() { return "\n"; }
      };
      var program = ts.createProgram([tsPathFile + ".ts"], compilerOptions, compilerHost);
      var errors = program.getDiagnostics();
      if(!errors.length) {
        var checker = program.getTypeChecker(true);
        errors = checker.getDiagnostics();
        checker.emitFiles();
        errors.forEach(function(e) { Console.log("TsCompiler#compile : error " + e.file.filename + "(" + e.file.getLineAndCharacterFromPosition(e.start).line + "): " + e.messageText); });
      }
      return outputs;
    }

    /**
     * Create the SourceFile.
     */
    private createSourceFile(dir: string, file: string, compilerOptions: ts.CompilerOptions): ts.SourceFile {
      Console.log("TsCompiler#createSourceFile : dir=" + dir);
      Console.log("TsCompiler#createSourceFile : file=" + file);
      Console.log("TsCompiler#createSourceFile : compilerOptions=" + compilerOptions);
      var sourceFile = null;
      try {
        sourceFile = ts.createSourceFile(file, fs.readFileSync(path.join(dir, file)).toString(), compilerOptions.target, "0");
      } catch(e) {
        if (e.code !== 'ENOENT') {
          Console.log("TsCompiler#readTsSource : failed to read ts source \"" + dir + "/" + file + "\" : " + e);
          process.exit(1);
        } else {
          Console.log("TsCompiler#readTsSource : ts source \"" + dir + "/" + file + "\" not found");
          sourceFile = undefined;
        }
      }
      Console.log("TsCompiler#createSourceFile : sourceFile=" + sourceFile);
      return sourceFile;
    }
  }

  /**
   * Represents a compiled JavaScript information.
   */
  class CompiledJs {
    private filename: string;
    private source: string;
    private writeByteOrderMark: string;

    constructor(filename: string, source: string, writeByteOrderMark: string) {
      this.filename = filename;
      this.source = source;
      this.writeByteOrderMark = writeByteOrderMark;
    }

    /**
     * Get JavaScript filename.
     */
    getFilename(): string {
      return this.filename;
    }

    /**
     * Get JavaScript source.
     */
    getSource(): string {
      return this.source;
    }

    isWriteByteOrderMark(): string {
      return this.writeByteOrderMark;
    }
  }
}

new ShellScriptTs.ShellScriptTs().execute();
