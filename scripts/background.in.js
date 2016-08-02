// Minigrace generates code that relies on the window variable being the
// global object. However, WebWorkers don't have access to the real `window`
// object.  This code constructs an object that has enough features for the
// generated code to run, and binds it to the window field of this.
// While this fake window doesn't have many of the expected features of
// the standard window, it is sufficient to allow minigrace to run.

this.window = this;

(function (window) {
  "use strict";

  var sources;
  window.importScripts("../js/minigrace.js");
  window.importScripts("../js/gracelib.js");
  window.importScripts("../js/dom.js");
  window.importScripts("../js/gtk.js");
  window.importScripts("../js/debugger.js");
  window.importScripts("../js/collectionsPrelude.js");
  window.importScripts("../js/StandardPrelude.js");
  window.importScripts("../js/importStandardPrelude.js");
  window.importScripts("../js/compiler.js");
  window.importScripts("../js/lexer.js");
  window.importScripts("../js/identifierKinds.js");
  window.importScripts("../js/ast.js");
  window.importScripts("../js/parser.js");
  window.importScripts("../js/genc.js");
  window.importScripts("../js/genjs.js");
  window.importScripts("../js/buildinfo.js");
  window.importScripts("../js/identifierresolution.js");
  window.importScripts("../js/stringMap.js");
  window.importScripts("../js/unixFilePath.js");
  window.importScripts("../js/xmodule.js");
  window.importScripts("../js/unicodedata.js");
  window.importScripts("../js/errormessages.js");
  //dynamically populated
JAVASCRIPT_SRC_FILES

  sources = {};

  window.minigrace.debugMode = true;
  window.minigrace.printStackFrames = false;
  window.minigrace.verbose = false;

  window.Grace_print = function () {
    return window.var_done;
  };

  function compile(name, source) {
    var dialect, escaped, output, stop;

    stop = false;

    window.minigrace.stderr_write = function (message) {
      var match;

      if (!stop && message.substring(0, 10) !== "minigrace:") {
        message = message.split("\n")[0];
        match = message.match(/\[(\d+):(?:\(?)(\d+)((?:-\d+)?)(?:\)?)\]/);

        window.postMessage({
          "isSuccessful": false,
          "name": name,
          "match": message,
          "reason": {
            "module": name,
            "line": match && match[1],
            "column": match && match[2],
            "message": match ?
              message.substring(message.indexOf(" ") + 1) : message
          }
        });

        stop = true;
      }
    };

    window.minigrace.modname = name;
    window.minigrace.mode = "js";

    try {
      window.minigrace.compile(source);
    } catch (error) {
      if (error instanceof ReferenceError) {
        dialect = error.message.match(/^gracecode_(\w+)/);

        if (dialect !== null) {
          window.postMessage({
            "name": name,
            "isSuccessful": false,
            "dependency": dialect[1]
          });

          return;
        }
      }

      window.postMessage({
        "isSuccessful": false,
        "name": name,
        "reason": {
          "message": error.message,
          "stack": error.stack
        }
      });

      return;
    }

    if (!window.minigrace.compileError) {
      escaped = graceModuleName(name);
      output = window.minigrace.generated_output;

      window.eval("var myframe;" + output +
                     ";window." + escaped + "=" + escaped);

      window.postMessage({
        "isSuccessful": true,
        "name": name,
        "output": output
      });
    }
  }

  window.onmessage = function (event) {
    var command = event.data;

    if (command.action === "compile") {
      if (command.hasOwnProperty("source")) {
        sources[command.name] = command.source;
      }

      compile(command.name, sources[command.name]);
    } else if (command.action === "forget") {
      //Set to undefined, rather than deleting, as system modules
      //cannot be deleted from the window object.
      window[graceModuleName(command.name)] = undefined;
    }
  };

}(this));
