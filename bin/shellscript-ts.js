var crypto=require("crypto"),fs=require("fs"),path=require("path"),ts=require("typescript"),vm=require("vm"),ShellScriptTs;!function(e){var t=function(){function e(){this.compiler=new o,this.cache=new s("/tmp/shellscript-ts/cache"),this.options=require("optimist").usage("A nodejs module for creating shellscript in TypeScript.\nUsage: $0 [options] file").describe("ssts.no-cache","Do not use cached JavaScript.")["default"]("ssts.no-cache",!1).describe("ssts.verbose","Shows details about the process.")["default"]("ssts.verbose",!1).describe("ssts.help","Print this message")["default"]("ssts.help",!1)["boolean"](["ssts.no-cache","ssts.verbose","ssts.help"]).demand(1)}return e.prototype.execute=function(){r.log("ShellScriptTs#execute : parsing args...");var e=this.parseArgs();r.log("ShellScriptTs#execute : resolving js...");var t=this.resolveJs(e);r.log("ShellScriptTs#execute : executing js..."),this.executeJs(t)},e.prototype.parseArgs=function(){var e=this.options.argv;return e.ssts.help&&(this.options.showHelp(),process.exit(1)),1!=e._.length&&(this.options.showHelp(),process.exit(1)),r.setEnabled(e.ssts.verbose),r.log("ShellScriptTs#parseArgs : verbose="+e.ssts.verbose),this.cache.setEnabled(!e.ssts["no-cache"]),r.log("ShellScriptTs#parseArgs : no-cache="+e.ssts["no-cache"]),r.log("ShellScriptTs#parseArgs : script="+e._[0]),e._[0]},e.prototype.resolveJs=function(e){var t=null;try{t=fs.readFileSync(e,"utf-8")}catch(s){r.log("ENOENT"!==s.code?'ShellScriptTs#resolveJs : failed to read file "'+e+'" : '+s:'ShellScriptTs#resolveJs : file "'+e+'" not found'),process.exit(1)}r.log("ShellScriptTs#resolveJs : scriptBody ---------------------"),r.log("\n"+t);var o=t.replace(/^#!.+\n/g,function(){return""});r.log("ShellScriptTs#resolveJs : tsBody -------------------------"),r.log("\n"+o);var c=this.cache.fetch(e,o);if(null==c){var i=path.dirname(e),l=path.basename(e),n=this.compiler.compile(i,l,o);c=n[l+".js"].getSource(),r.log("ShellScriptTs#resolveJs storing cache"),this.cache.store(e,o,c)}return r.log("ShellScriptTs#resolveJs : jsBody -------------------------"),r.log("\n"+c),c},e.prototype.executeJs=function(e){r.log("ShellScriptTs#executeJs : jsBody -------------------------"),r.log("\n"+e);var t={console:console,process:process,require:require},s=vm.createContext(t);vm.runInContext(e,s)},e}();e.ShellScriptTs=t;var r=function(){function e(){}return e.setEnabled=function(e){this.enabled=e},e.log=function(e){this.enabled&&console.log(this.prefix+e)},e.prefix="[shellscript.ts] ",e}(),s=function(){function e(e){this.cacheDir=e;try{require("mkdirp").sync(this.cacheDir)}catch(t){if("ENOENT"!==t.code)throw t}}return e.prototype.setEnabled=function(e){this.enabled=e},e.prototype.fetch=function(e,t){if(!this.enabled)return r.log("Cache#fetch : fetch skipped."),null;var s=this.createCacheId(e,t),o=this.cacheDir+"/"+s;r.log("Cache#fetch : cacheFilename="+o);try{var c=fs.readFileSync(o,"utf-8");return r.log("Cache#fetch : fetched cache"),c}catch(i){if("ENOENT"!==i.code)throw i;return r.log("Cache#fetch : no cache"),null}},e.prototype.store=function(e,t,s){if(!this.enabled)return void r.log("Cache#store : store skipped.");var o=this.createCacheId(e,t),c=this.cacheDir+"/"+o;r.log("Cache#store : cacheFilename="+c),fs.writeFile(c,s),r.log("Cache#store : stored cache")},e.prototype.createCacheId=function(e,t){var s=fs.realpathSync(e);r.log("Cache#createCacheId : tsRealPath="+s);var o=path.basename(s);r.log("Cache#createCacheId : tsFilename="+o);var c=crypto.createHash("sha1").update(s).digest("hex");r.log("Cache#createCacheId : tsRealPathHash="+c);var i=crypto.createHash("sha1").update(t).digest("hex");r.log("Cache#createCacheId : tsBodyHash="+i);var l=o+"."+c+"."+i;return r.log("Cache#createCacheId : cacheId="+l),l},e}(),o=function(){function e(){}return e.prototype.compile=function(e,t,s,o){void 0===o&&(o={});var i=this,l="lib.d.ts",n=fs.readFileSync(path.join(path.dirname(require.resolve("typescript")),l)).toString(),a="node.d.ts",h=fs.readFileSync("./lib/node-0.11.d.ts").toString(),p={},u={getSourceFile:function(c,p){r.log("compilerHost#getSourceFile : filename="+c),r.log("compilerHost#getSourceFile : languageVersion="+p);var u=null;return c===t+".ts"?u=ts.createSourceFile(c,s,o.target,"0"):c===l?u=ts.createSourceFile(c,n,o.target,"0"):c===a?u=ts.createSourceFile(c,h,o.target,"0"):(u=i.createSourceFile(e,c,o),void 0===u&&(u=i.createSourceFile(process.cwd(),c,o))),r.log("compilerHost#getSourceFile : sourceFile="+u),u},writeFile:function(e,t,r){p[e]=new c(e,t,r)},getDefaultLibFilename:function(){return l},useCaseSensitiveFileNames:function(){return!1},getCanonicalFileName:function(e){return e},getCurrentDirectory:function(){return""},getNewLine:function(){return"\n"}},g=ts.createProgram([t+".ts"],o,u),f=g.getDiagnostics();if(!f.length){var d=g.getTypeChecker(!0);f=d.getDiagnostics(),d.emitFiles(),f.forEach(function(e){r.log("TsCompiler#compile : error "+e.file.filename+"("+e.file.getLineAndCharacterFromPosition(e.start).line+"): "+e.messageText)})}return p},e.prototype.createSourceFile=function(e,t,s){r.log("TsCompiler#createSourceFile : dir="+e),r.log("TsCompiler#createSourceFile : file="+t),r.log("TsCompiler#createSourceFile : compilerOptions="+s);var o=null;try{o=ts.createSourceFile(t,fs.readFileSync(path.join(e,t)).toString(),s.target,"0")}catch(c){"ENOENT"!==c.code?(r.log('TsCompiler#readTsSource : failed to read ts source "'+e+"/"+t+'" : '+c),process.exit(1)):(r.log('TsCompiler#readTsSource : ts source "'+e+"/"+t+'" not found'),o=void 0)}return r.log("TsCompiler#createSourceFile : sourceFile="+o),o},e}(),c=function(){function e(e,t,r){this.filename=e,this.source=t,this.writeByteOrderMark=r}return e.prototype.getFilename=function(){return this.filename},e.prototype.getSource=function(){return this.source},e.prototype.isWriteByteOrderMark=function(){return this.writeByteOrderMark},e}()}(ShellScriptTs=exports.ShellScriptTs||(exports.ShellScriptTs={}));