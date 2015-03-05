# shellscript-ts
A nodejs module for creating shellscript in TypeScript.

# Install

With [npm](https://www.npmjs.com/) do:

```bash
$ npm install shellscript-ts
```

# Usage

Put a shebang line on top of your shellscript.

```bash
#!/usr/bin/env shellscript-ts
```

# Sample shellscript

```typescript
#!/usr/bin/env shellscript-ts

class HelloWorld {
  constructor() {
    console.log("Hello, World!!");
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
