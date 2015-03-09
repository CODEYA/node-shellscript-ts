![CircleCI badge](https://circleci.com/gh/CODEYA/node-shellscript-ts.svg?style=shield&circle-token=22b1f118b0d8681d324ffff0a796cccd4e0ab9d7)

# shellscript-ts
A nodejs module for creating shellscript in TypeScript.

# Install

With [npm](https://www.npmjs.com/) do:

```bash
$ npm install -g shellscript-ts
```

# Usage

Put a shebang line on top of your shellscript.

```bash
#!/usr/bin/env shellscript-ts
```

# Sample shellscript

```typescript
#!/usr/bin/env shellscript-ts

/// <reference path="node.d.ts" />

import http = require("http");

class HelloWorld {
  constructor() {
    console.log("Current working directory : " + process.cwd());
    http.get("http://www.codeya.co.jp/", function(res) {
      console.log("OK : " + res.statusCode);
    }).on('error', function(e) {
      console.log("Error : " + e.message);
    });
  }
}
new HelloWorld();
```

# Building

In order to build the shellscript-ts, ensure that you have [git](http://git-scm.com/) and [node.js](http://nodejs.org/) installed.

Clone a copy of the repository:

```bash
$ git clone git@github.com:CODEYA/node-shellscript-ts.git
```

Change to the shellscript-ts directory:

```bash
$ cd node-shellscript-ts
```

Install dev dependencies:

```bash
$ npm install
```

Build the shellscript-ts:

```bash
$ gulp
```
