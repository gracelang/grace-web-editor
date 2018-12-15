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
  window.importScripts("../js/debugger.js");
  window.importScripts("../js/collectionsPrelude.js");
  window.importScripts("../js/standardGrace.js");
  window.importScripts("../js/importStandardGrace.js");
  window.importScripts("../js/dom.js");
  window.importScripts("../js/gtk.js");
  window.importScripts("../js/compiler.js");
  window.importScripts("../js/lexer.js");
  window.importScripts("../js/identifierKinds.js");
  window.importScripts("../js/ast.js");
  window.importScripts("../js/parser.js");
  window.importScripts("../js/genjs.js");
  window.importScripts("../js/buildinfo.js");
  window.importScripts("../js/identifierresolution.js");
  window.importScripts("../js/fastDict.js");
  window.importScripts("../js/unixFilePath.js");
  window.importScripts("../js/xmodule.js");
  window.importScripts("../js/unicodedata.js");
  window.importScripts("../js/errormessages.js");
  window.importScripts("../js/timer.js");

  // dynamically populated by tools/includeJSLibraries based on the Makefile
  // variable ALL_LIBRARY_MODULES.  The next line is the key for
  // JAVASCRIPT_SRC_FILES

  sources = {};

  window.minigrace.debugMode = true;
  window.minigrace.printStackFrames = false;
  window.minigrace.verbose = false;

  window.Grace_print = function () {
    return window.var_done;
  };

  function compile(name, source) {
    var stop = false;
    var compiler_output = "";
    var lineNr = "0";
    var cols = "0";
    var description;

    window.minigrace.stderr_write = function (message) {
        if ((compiler_output !== "") && (! compiler_output.endsWith("\n"))) {
            compiler_output = compiler_output + "\n";
        }
        var match = message.match(/\[(\d+):(\d+(-(\d+:)?\d+)?)\]: (.*)/);
        if (match) {
            lineNr = match[1];
            cols = match[2];
            description = match[5];
        } else {
            match = message.match(/\[(\d+)]: (.*)/);
            if (match) {
                lineNr = match[1];
                description = match[2];
            } else {
                description = message;
            }
        }

        compiler_output = compiler_output + description;

        if (message.startsWith(name + ".grace")) {
            // This is the normal case of a syntax error in a module
            // being compiled.
            stop = true;
            window.postMessage({
              "isSuccessful": false,
              "name": name,
              "match": "",
              "reason": {
                "module": name,
                "line": lineNr,
                "column": cols,
                "message": compiler_output
              }
            });
        }

        if (match = message.match( /.* on line (\d+) of ([^ :]+):/ )) {
            //  When a dialect contains a bug, this gets the name of
            //  the dialect and puts it into reason.
            stop = true;
            window.postMessage({
              "isSuccessful": false,
              "name": name,
              "match": "",
              "reason": {
                "module": match[2],
                "line": match[1],
                "column": cols,
                "message": compiler_output
              }
            });
        }

        if (( message.startsWith("minigrace:") ||
              message.startsWith("Compilation terminated"))) {
            //  This is designed to catch other errors, such as a compiler
            //  crash, and ensure that some output is generated, rather than
            //  the foregorund process forever waiting for a response.
            stop = true;
            window.postMessage({
              "isSuccessful": false,
              "name": name,
              "match": "Compiler Error.  " + message,
              "reason": {
                "module": "minigrace",
                "line": lineNr,
                "column": cols,
                "message": compiler_output
              }
            });
        }
    };

    window.minigrace.modname = name;
    window.minigrace.mode = "js";

    try {
      window.minigrace.compile(source);
    } catch (error) {
      if (error instanceof ReferenceError) {
        var dialect = error.message.match(/^gracecode_(\w+)/);

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
      var escaped = graceModuleName(name);
      var output = window.minigrace.generated_output;

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
