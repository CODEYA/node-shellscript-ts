/// <reference path="../lib/node-0.11.d.ts" />

export module ShellScriptTs {

  /**
   * Main class of ShellScriptTs
   */
  export class ShellScriptTs {

    private fs = require('fs');
    private tss = require('typescript-simple');
    private vm = require('vm');
    private console = new Console('[shellscript.ts] ');
    private cache = new Cache('/tmp/shellscript-ts/cache', this.console);
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
      this.console.log('ShellScriptTs#execute : parsing args...');
      var tsPath = this.parseArgs();

      this.console.log('ShellScriptTs#execute : resolving js...');
      var jsBody = this.resolveJs(tsPath);

      this.console.log('ShellScriptTs#execute : executing js...');
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

      this.console.setEnabled(argv.v);
      this.console.log('ShellScriptTs#parseArgs : verbose=' + argv.v);

      this.cache.setEnabled(!argv.n);
      this.console.log('ShellScriptTs#parseArgs : no-cache=' + argv.n);

      this.console.log('ShellScriptTs#parseArgs : script=' + argv._[0]);
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
        scriptBody = this.fs.readFileSync(tsPath, 'utf-8');
      } catch(e) {
        if (e.code !== 'ENOENT') {
          this.console.log("ShellScriptTs#resolveJs : failed to read file \"" + tsPath + "\" : " + e);
        } else {
          this.console.log("ShellScriptTs#resolveJs : file \"" + tsPath + "\" not found");
        }
        process.exit(1);
      }
      this.console.log('ShellScriptTs#resolveJs : scriptBody ---------------------');
      this.console.log('\n' + scriptBody);

      // remove shebang
      var tsBody = scriptBody.replace(/^#!.+\n/g, (str) => "");
      this.console.log('ShellScriptTs#resolveJs : tsBody -------------------------');
      this.console.log('\n' + tsBody);

      // prepare JavaScript
      var jsBody = this.cache.fetch(tsPath, tsBody);
      if(jsBody == null) {
        jsBody = this.tss(tsBody);
        this.console.log('ShellScriptTs#resolveJs storing cache');
        this.cache.store(tsPath, tsBody, jsBody);
      }
      this.console.log('ShellScriptTs#resolveJs : jsBody -------------------------');
      this.console.log('\n' + jsBody);

      return jsBody;
    }

    /**
     * Executes a JavaScript.
     */
    private executeJs(jsBody:string): void {
      this.console.log('ShellScriptTs#executeJs : jsBody -------------------------');
      this.console.log('\n' + jsBody);

      this.vm.runInThisContext(jsBody);
    }
  }

  /**
   * Console for ShellScript.ts
   */
  class Console {
    private prefix:string;
    private enabled:boolean;

    constructor(prefix:string) {
      this.prefix = prefix;
    }

    /**
     * Sets true if the console enabled.
     */
    setEnabled(enabled:boolean):void {
      this.enabled = enabled;
    }

    /**
     * Outputs a message to stdout.
     */
    log(message:string) {
      if(this.enabled) {
        console.log(this.prefix + message);
      }
    }
  }

  /**
   * Cache of JavaScript.
   */
  class Cache {
    private fs = require('fs');
    private mkdirp = require('mkdirp');
    private crypto = require('crypto');
    private cacheDir:string;
    private enabled:boolean;
    private console:Console;

    constructor(cacheDir:string, console:Console) {
      this.cacheDir = cacheDir;
      this.console = console;

      // create a cache directory.
      try {
        this.mkdirp.sync(this.cacheDir);
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
        this.console.log("Cache#fetch : fetch skipped.");
        return null;
      }

      var cacheId = this.createCacheId(tsPath, tsBody);
      var cacheFileName = this.cacheDir + "/" + cacheId;
      this.console.log("Cache#fetch : cacheFileName=" + cacheFileName);

      try {
        var cache = this.fs.readFileSync(cacheFileName, 'utf-8');
        this.console.log("Cache#fetch : fetched cache");
        return cache;
      } catch(e) {
        if (e.code !== 'ENOENT') {
          throw e;
        }
        this.console.log("Cache#fetch : no cache");
        return null;
      }
    }

    /**
     * Stores a js body to cache.
     */
    store(tsPath:string, tsBody:string, jsBody:string):void {
      if(!this.enabled) {
        this.console.log("Cache#store : store skipped.");
        return;
      }

      var cacheId = this.createCacheId(tsPath, tsBody);
      var cacheFileName = this.cacheDir + "/" + cacheId;
      this.console.log("Cache#store : cacheFileName=" + cacheFileName);

      this.fs.writeFile(cacheFileName, jsBody);
      this.console.log("Cache#store : stored cache");
    }

    /**
     * Creates cache ID.
     */
    private createCacheId(tsPath:string, tsBody:string):string {
      var tsRealPath = this.fs.realpathSync(tsPath);
      this.console.log("Cache#createCacheId : tsRealPath=" + tsRealPath);
      var tsFileName = tsRealPath.match(/\/([^/]+)$/);
      tsFileName = tsFileName[1];
      this.console.log("Cache#createCacheId : tsFileName=" + tsFileName);

      var tsRealPathHash = this.crypto.createHash('sha1').update(tsRealPath).digest('hex');
      this.console.log("Cache#createCacheId : tsRealPathHash=" + tsRealPathHash);
      var tsBodyHash = this.crypto.createHash('sha1').update(tsBody).digest('hex');
      this.console.log("Cache#createCacheId : tsBodyHash=" + tsBodyHash);

      var cacheId = tsFileName + "." + tsRealPathHash + "." + tsBodyHash;
      this.console.log("Cache#createCacheId : cacheId=" + cacheId);
      return cacheId;
    }
  }
}

new ShellScriptTs.ShellScriptTs().execute();
