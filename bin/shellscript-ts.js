/// <reference path="../lib/node-0.11.d.ts" />
/// <reference path="../node_modules/typescript/bin/typescript.d.ts" />
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import * as vm from "vm";
export var ShellScriptTs;
(function (ShellScriptTs_1) {
    var NodeModules = [
        'process', 'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate'
    ];
    class ShellScriptTs {
        constructor() {
            this.compiler = new TsCompiler();
            this.cache = new Cache('/tmp/shellscript-ts/cache');
            this.Optimist = require('optimist');
            this.options = new this.Optimist(process.argv.slice(2))
                .usage('A nodejs module for creating shellscript in TypeScript.\nUsage: $0 [options] file')
                .describe('ssts.no-cache', 'Do not use cached JavaScript.')
                .default('ssts.no-cache', false)
                .describe('ssts.verbose', 'Shows details about the process.')
                .default('ssts.verbose', false)
                .describe('ssts.help', 'Print this message')
                .default('ssts.help', false)
                .boolean(['ssts.no-cache', 'ssts.verbose', 'ssts.help'])
                .demand(1);
        }
        execute() {
            Console.log('ShellScriptTs#execute : parsing args...');
            var tsPath = this.parseArgs();
            Console.log('ShellScriptTs#execute : resolving js...');
            var jsBody = this.resolveJs(tsPath);
            Console.log('ShellScriptTs#execute : executing js...');
            this.executeJs(jsBody, tsPath);
        }
        parseArgs() {
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
        resolveJs(tsPath) {
            var scriptBody = null;
            try {
                scriptBody = fs.readFileSync(tsPath, 'utf-8');
            }
            catch (e) {
                if (e.code !== 'ENOENT') {
                    Console.log("ShellScriptTs#resolveJs : failed to read file \"" + tsPath + "\" : " + e);
                }
                else {
                    Console.log("ShellScriptTs#resolveJs : file \"" + tsPath + "\" not found");
                }
                process.exit(1);
            }
            Console.log('ShellScriptTs#resolveJs : scriptBody ---------------------');
            Console.log('\n' + scriptBody);
            var tsBody = scriptBody.replace(/^#!.+\n/g, (str) => "");
            Console.log('ShellScriptTs#resolveJs : tsBody -------------------------');
            Console.log('\n' + tsBody);
            var jsBody = this.cache.fetch(tsPath, tsBody);
            if (jsBody == null) {
                var tsPathDir = path.dirname(tsPath);
                var tsPathFile = path.basename(tsPath);
                var jsBodies = this.compiler.compile(tsPathDir, tsPathFile, tsBody, { target: 2 });
                if (!jsBodies[tsPathFile + ".js"]) {
                    Console.log('ShellScriptTs#resolveJs no jsBodies');
                    process.exit(1);
                }
                else {
                    jsBody = "";
                    for (var fileName in jsBodies) {
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
        executeJs(jsBody, tsPath) {
            Console.log('ShellScriptTs#executeJs : jsBody -------------------------');
            Console.log('\n' + jsBody);
            var contextVars = {
                require: require
            };
            NodeModules.forEach((modName) => {
                contextVars[modName] = eval(modName);
            });
            contextVars['__dirname'] = path.dirname(tsPath);
            contextVars['__filename'] = path.basename(tsPath);
            var context = vm.createContext(contextVars);
            vm.runInContext(jsBody, context);
        }
    }
    ShellScriptTs_1.ShellScriptTs = ShellScriptTs;
    class Console {
        static setEnabled(enabled) {
            this.enabled = enabled;
        }
        static log(message) {
            if (this.enabled) {
                console.log(this.prefix + message);
            }
        }
    }
    Console.prefix = '[shellscript.ts] ';
    class Cache {
        constructor(cacheDir) {
            this.cacheDir = cacheDir;
            try {
                require('mkdirp').sync(this.cacheDir);
            }
            catch (e) {
                if (e.code !== 'ENOENT') {
                    throw e;
                }
            }
        }
        setEnabled(enabled) {
            this.enabled = enabled;
        }
        fetch(tsPath, tsBody) {
            if (!this.enabled) {
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
            }
            catch (e) {
                if (e.code !== 'ENOENT') {
                    throw e;
                }
                Console.log("Cache#fetch : no cache");
                return null;
            }
        }
        store(tsPath, tsBody, jsBody) {
            if (!this.enabled) {
                Console.log("Cache#store : store skipped.");
                return;
            }
            var cacheId = this.createCacheId(tsPath, tsBody);
            var cacheFilename = this.cacheDir + "/" + cacheId;
            Console.log("Cache#store : cacheFilename=" + cacheFilename);
            fs.writeFileSync(cacheFilename, jsBody);
            Console.log("Cache#store : stored cache");
        }
        createCacheId(tsPath, tsBody) {
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
    class TsCompiler {
        compile(tsPathDir, tsPathFile, tsBody, compilerOptions = {}) {
            var self = this;
            var libFilename = "lib.d.ts";
            var libSource = fs.readFileSync(path.join(path.dirname(require.resolve('typescript')), libFilename)).toString();
            var nodeFilename = "node.d.ts";
            var nodeSource = fs.readFileSync(path.join(__dirname, "../lib/node-0.11.d.ts")).toString();
            var outputs = {};
            var compilerHost = {
                getSourceFile: function (filename, languageVersion) {
                    Console.log("compilerHost#getSourceFile : filename=" + filename);
                    Console.log("compilerHost#getSourceFile : languageVersion=" + languageVersion);
                    var sourceFile = null;
                    if (filename === tsPathFile + ".ts") {
                        sourceFile = ts.createSourceFile(filename, tsBody, compilerOptions.target, false);
                    }
                    else if (filename === libFilename) {
                        sourceFile = ts.createSourceFile(filename, libSource, compilerOptions.target, false);
                    }
                    else if (filename === nodeFilename) {
                        sourceFile = ts.createSourceFile(filename, nodeSource, compilerOptions.target, false);
                    }
                    else {
                        sourceFile = self.createSourceFile(tsPathDir, filename, compilerOptions);
                        if (sourceFile === undefined) {
                            sourceFile = self.createSourceFile(process.cwd(), filename, compilerOptions);
                        }
                    }
                    Console.log("compilerHost#getSourceFile : sourceFile=" + sourceFile);
                    return sourceFile;
                },
                writeFile: function (name, text, writeByteOrderMark) {
                    outputs[name] = new CompiledJs(name, text, writeByteOrderMark);
                },
                getDefaultLibFileName: function (options) { return libFilename; },
                useCaseSensitiveFileNames: function () { return false; },
                getCanonicalFileName: function (filename) { return filename; },
                getCurrentDirectory: function () { return ""; },
                getNewLine: function () { return "\n"; }
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
            return outputs;
        }
        createSourceFile(dir, file, compilerOptions) {
            Console.log("TsCompiler#createSourceFile : dir=" + dir);
            Console.log("TsCompiler#createSourceFile : file=" + file);
            Console.log("TsCompiler#createSourceFile : compilerOptions=" + compilerOptions);
            var sourceFile = null;
            try {
                sourceFile = ts.createSourceFile(file, fs.readFileSync(path.join(dir, file)).toString(), compilerOptions.target, false);
            }
            catch (e) {
                if (e.code !== 'ENOENT') {
                    Console.log("TsCompiler#readTsSource : failed to read ts source \"" + dir + "/" + file + "\" : " + e);
                    process.exit(1);
                }
                else {
                    Console.log("TsCompiler#readTsSource : ts source \"" + dir + "/" + file + "\" not found");
                    sourceFile = undefined;
                }
            }
            Console.log("TsCompiler#createSourceFile : sourceFile=" + sourceFile);
            return sourceFile;
        }
    }
    class CompiledJs {
        constructor(filename, source, writeByteOrderMark) {
            this.filename = filename;
            this.source = source;
            this.writeByteOrderMark = writeByteOrderMark;
        }
        getFilename() {
            return this.filename;
        }
        getSource() {
            return this.source;
        }
        isWriteByteOrderMark() {
            return this.writeByteOrderMark;
        }
    }
})(ShellScriptTs || (ShellScriptTs = {}));
