/*globals minigrace, postMessage, var_done*/

var document, sources, window;

window = this;
document = {};

this.importScripts("minigrace.min.js");
this.importScripts("objectdrawdeux.js");

sources = {};

minigrace.debugMode = true;
minigrace.printStackFrames = false;
minigrace.verbose = false;

this.Grace_print = function() {
  return var_done;
};

function compile(name, source) {
  var dialect, escaped, output, stop;

  stop = false;

  minigrace.stderr_write = function (message) {
    var match;

    if (!stop && message.substring(0, 10) !== "minigrace:") {
      message = message.split("\n")[0];
      match = message.match(/\[(\d+):(?:\(?)(\d+)((?:-\d+)?)(?:\)?)\]/);

      postMessage({
        isSuccessful: false,
        name: name,
        match: message,
        reason: {
          module: name,
          line: match && match[1],
          column: match && match[2],
          message: match ? message.substring(message.indexOf(" ") + 1) : message
        }
      });

      stop = true;
    }
  };

  minigrace.modname = name;
  minigrace.mode = "js";

  try {
    minigrace.compile(source);
  } catch (error) {
    if (error instanceof ReferenceError) {
      dialect = error.message.match(/^gracecode_(\w+)/);

      if (dialect !== null) {
        postMessage({
          name: name,
          isSuccessful: false,
          dependency: dialect[1]
        });

        return;
      }
    }

    postMessage({
      isSuccessful: false,
      name: name,
      reason: {
        message: error.message,
        stack: error.stack
      }
    });

    return;
  }

  if (!minigrace.compileError) {
    escaped = "gracecode_" + name.replace("/", "$");
    output = minigrace.generated_output;

    /*jslint evil: true*/
    eval("var myframe;" + output + ";window." + escaped + "=" + escaped);
    /*jslint evil: false*/

    postMessage({
      isSuccessful: true,
      name: name,
      output: output
    });
  }
}

this.onmessage = function (event) {
  var command = event.data;

  if (command.action === "compile") {
    if (command.hasOwnProperty("source")) {
      sources[command.name] = command.source;
    }

    compile(command.name, sources[command.name]);
  } else if (command.action === "forget") {
    delete window["gracecode_" + command.name];
  }
};
