/// <reference path="../lib/node-0.11.d.ts" />
/// <reference path="../node_modules/typescript/bin/typescript.d.ts" />

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import * as vm from "vm";

export module ShellScriptTs {

  /**
   * Node Modules supposed to be used in ts-shell-script.
   */
  var NodeModules: string[] = [
    'process', 'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate'
  ]

  /**
   * Main class of ShellScriptTs
   */
  export class ShellScriptTs {

    private compiler = new TsCompiler();
    private cache = new Cache('/tmp/shellscript-ts/cache');
    private Optimist = require('optimist');
    private options = new this.Optimist(process.argv.slice(2))
        .usage('A nodejs module for creating shellscript in TypeScript.\nUsage: $0 [options] file')
        // --ssts.no-cache
        .describe('ssts.no-cache', 'Do not use cached JavaScript.')
        .default('ssts.no-cache', false)
        // --ssts.verbose
        .describe('ssts.verbose', 'Shows details about the process.')
        .default('ssts.verbose', false)
        // --ssts.help
        .describe('ssts.help', 'Print this message')
        .default('ssts.help', false)
        // --ssts.no-cache / --ssts.verbose / --ssts.help are boolean
        .boolean(['ssts.no-cache','ssts.verbose', 'ssts.help'])
        // non-option arguments
        .demand(1);

    execute(): void {
      Console.log('ShellScriptTs#execute : parsing args...');
      var tsPath = this.parseArgs();

      Console.log('ShellScriptTs#execute : resolving js...');
      var jsBody = this.resolveJs(tsPath);

      Console.log('ShellScriptTs#execute : executing js...');
      this.executeJs(jsBody, tsPath);
    }

    /**
     * Parses an arguments.
     */
    private parseArgs():string {
      var argv = this.options.argv;

      if (argv.ssts["help"]) {
        this.options.showHelp();
        process.exit(1);
      }

      Console.setEnabled(argv.ssts["verbose"]);
      Console.log('ShellScriptTs#parseArgs : verbose=' + argv.ssts["verbose"]);

      this.cache.setEnabled(!argv.ssts["no-cache"]);
      Console.log('ShellScriptTs#parseArgs : no-cache=' + argv.ssts["no-cache"]);

      Console.log('ShellScriptTs#parseArgs : script=' + argv._[0]);
      var target = argv._[0];

      process.argv.shift();

      return target;
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
        var jsBodies = this.compiler.compile(tsPathDir, tsPathFile, tsBody, {target: ts.ScriptTarget.ES6});
        if (!jsBodies[tsPathFile + ".js"]) {
          // TODO: exception should be raised here.
          Console.log('ShellScriptTs#resolveJs no jsBodies');
          process.exit(1);
        } else {
          jsBody = "";
          for(var fileName in jsBodies) {
            jsBody += jsBodies[fileName].getSource() + "\n";
          }
        }
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
    private executeJs(jsBody:string, tsPath:string): void {
      Console.log('ShellScriptTs#executeJs : jsBody -------------------------');
      Console.log('\n' + jsBody);

      var contextVars = {
        require: require
      }
      // add node modules
      NodeModules.forEach((modName) => {
        contextVars[modName] = eval(modName);
      })
      contextVars['__dirname'] = path.dirname(tsPath);
      contextVars['__filename'] = path.basename(tsPath);
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

      fs.writeFileSync(cacheFilename, jsBody);
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
      var nodeSource = fs.readFileSync(path.join(__dirname, "../lib/node-0.11.d.ts")).toString();
      var outputs: { [key: string]: CompiledJs; } = {};
      var compilerHost: ts.CompilerHost = {
        getSourceFile: function (filename, languageVersion) {
          Console.log("compilerHost#getSourceFile : filename=" + filename);
          Console.log("compilerHost#getSourceFile : languageVersion=" + languageVersion);
          var sourceFile = null;
          if(filename === tsPathFile + ".ts") {
            sourceFile = ts.createSourceFile(filename, tsBody, compilerOptions.target, false);
          } else if(filename === libFilename) {
            sourceFile = ts.createSourceFile(filename, libSource, compilerOptions.target, false);
          } else if(filename === nodeFilename) {
            sourceFile = ts.createSourceFile(filename, nodeSource, compilerOptions.target, false);
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
        getDefaultLibFileName: function(options: ts.CompilerOptions) { return libFilename; },
        useCaseSensitiveFileNames: function() { return false; },
        getCanonicalFileName: function (filename) { return filename; },
        getCurrentDirectory: function() { return ""; },
        getNewLine: function() { return "\n"; }
      };
      var program = ts.createProgram([tsPathFile + ".ts"], compilerOptions, compilerHost);
      var emitResult = program.emit();

      var allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
      allDiagnostics.forEach(diagnostic => {
        var lineAndCharacter = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        var message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        console.log("${diagnostic.file.fileName} (${lineAndCharacter.line + 1},${lineAndCharacter.character + 1}): ${message}");
      });

      var exitCode = emitResult.emitSkipped ? 1 : 0;
      console.log("Process exiting with code '${exitCode}'.");
      //process.exit(exitCode);

      /*
      var errors = program.getDiagnosticsProducingTypeChecker();
      errors.forEach(function(e) { console.log("TsCompiler#compile : error " + e.file.filename + "(" + e.file.getLineAndCharacterFromPosition(e.start).line + "): " + e.messageText); });
      if(errors.length === 0) {
        var checker = program.getTypeChecker(true);
        errors = checker.getDiagnostics();
        if(errors.length) {
          errors.forEach(function(e) { console.log("TsCompiler#typechecker : error " + e.file.filename + "(" + e.file.getLineAndCharacterFromPosition(e.start).line + "): " + e.messageText); });
          process.exit(1);
        }
        checker.emitFiles();
      }
      */
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
        sourceFile = ts.createSourceFile(file, fs.readFileSync(path.join(dir, file)).toString(), compilerOptions.target, false);
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
    private writeByteOrderMark: boolean;

    constructor(filename: string, source: string, writeByteOrderMark: boolean) {
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

    isWriteByteOrderMark(): boolean {
      return this.writeByteOrderMark;
    }
  }
}
