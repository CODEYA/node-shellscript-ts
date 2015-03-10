#!/usr/bin/env shellscript-ts

/// <reference path="node.d.ts" />

var http = require('http');

class HttpClient {

  execute(): void {
    var url = process.argv[2];

    http.get(url, function(res) {
      console.log(res.statusCode);
      console.log();
      for (var key in res.headers) {
        console.log(key + "=" + res.headers[key]);
      }
      console.log();

      res.on("data", function(chunk) {
        console.log("" + chunk);
      });
    }).on('error', function(e) {
      console.log("Error : " + e.message);
    });
  }
}
new HttpClient().execute();
