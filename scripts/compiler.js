"use strict";

var $, path, queue, worker;

$ = require("jquery");
path = require("path");
import extractDependencies from "../typescript/transpiledJs/extractDependencies.js";
import {GNode, Graph, kahnTopologicalSort} from "../typescript/transpiledJs/toposort";

queue = {};
worker = new Worker("scripts/background.js");

function pump(name, key, value) {
  var i, l, q;

  q = queue[name] || [];

  for (i = 0, l = q.length; i < l; i += 1) {
    q[i][key](value);
  }

  delete queue[name];
}

//Check to see if the module is already compiled and stored 
//in the window object 
function isCompiled(name) {
  return (typeof global[graceModuleName(name)] !== "undefined");
}

exports.isCompiled = isCompiled;

exports.isCompiling = function (name) {
  name = path.basename(name, ".grace");

  return queue[name] && queue[name].length > 0;
};

exports.forget = function (name) {
  name = path.basename(name, ".grace");
  //Set to undefined, rather than deleting, as system modules
  //cannot be deleted from the window object.
  global[graceModuleName(name)] = undefined;
  gctCache[name] = undefined;

  worker.postMessage({
    "action": "forget",
    "name": name
  });
};

function compileOneModule(name, source, callback) {
  var callbacks = queue[name] || [];

  callbacks.push({
    "onSuccess": function (output) {
      var escaped = graceModuleName(name);

      try {
        global["eval"]("var myframe;" + output +
                       ";window." + escaped + "=" + escaped);
      } catch (error) {
        callback({
          "line": 1,
          "column": 1,
          "type": "error",
          "text": error.message || error
        });
        return;
      }

      callback(null, output);

      //Call the run as part of this callback
      var run = document.getElementById("runButton");
      run.click();
    },

    "onFailure": callback
  });

  if (!queue.hasOwnProperty(name)) {
    worker.postMessage({
      "action": "compile",
      "name": name,
      "source": source
    });

    queue[name] = callbacks;
  }
}

function compileModuleGraph(sourceName, source, callback) {
    const g = buildModuleGraph(sourceName);
    const toBeCompiled = kahnTopologicalSort(g);
    for (let ix = toBeCompiled.length - 1; ix >= 0; ix--) {
        const moduleName = toBeCompiled[ix];
        if (! isCompiled(moduleName)) {
            console.warn(`compiling "${moduleName}"`);
            compileOneModule(moduleName, file.contents(moduleName), callback);
        }

function buildModuleGraph(sourceName) {
    const processedModules = new Set();
    const unprocessedModules = [sourceName];
    const g = new Graph();
    while (unprocessedModules.length > 0) {
        const sourceName = unprocessedModules.shift();
        if processedModules.has(sourceName) continue;
        const source = file.contents(sourceName);
        const dependents = extractDependencies(source);
        for (let ix = 0, nd = dependents.length; ix < nd; ix ++) {
            const each = dependents[ix];
            g.addEdgeByName(name, each);
            unprocessedModules.push(each);
        }
        processedModules.add(sourceName);
    }
    return g;
}

exports.compile = compileModuleGraph;

worker.onmessage = function (event) {
  var count, match, output, recompile, regexp, result;

  result = event.data;

  function respond(error) {
    if (count === 0) {
      return;
    }

    if (error !== null) {
      count = 0;
      pump(result.name, "onFailure", error);
    } else {
      count -= 1;

      if (count === 0) {
        pump(result.name, "onSuccess", result.output);
      }
    }
  }

  if (result.isSuccessful) {
    output = result.output;
    regexp = /do_import\("(\w+)", \w+\)/;

    match = output.match(regexp);

    if (match !== null) {
      recompile = [];

      do {
        if (!isCompiled(match[1])) {
          if (!localStorage.hasOwnProperty("file:" + match[1] + ".grace")) {
            pump(result.name, "onFailure", {
              "message": 'Cannot find module "' + match[1] + '"'
            });

            return;
          }

          recompile.push(match[1]);
        }

        output = output.substring(match.index + match[0].length);
        match = output.match(regexp);
      } while (match !== null);

      if (recompile.length > 0) {
        count = recompile.length;
        recompile.forEach(function (name) {
          compile(name, localStorage["file:" + name + ".grace"], respond);
        });

        return;
      }
    }

    pump(result.name, "onSuccess", result.output);
  } else if (result.dependency) {
    if (queue[result.dependency]) {
      worker.postMessage({
        "action": "compile",
        "name": result.name
      });
    } else if (localStorage.hasOwnProperty("file:" +
        result.dependency + ".grace")) {
      compile(result.dependency,
        localStorage["file:" + result.dependency + ".grace"], function (error) {
          if (error !== null) {
            pump(result.name, "onFailure", error);
          } else {
            worker.postMessage({
              "action": "compile",
              "name": result.name
            });
          }
        });
    } else {
      pump(result.name, "onFailure", {
        "message": 'Cannot find module "' + result.dependency + '"'
      });
    }
  } else {
    pump(result.name, "onFailure", result.reason);
  }
};

$(function () {
  $("#version").text("Grace Compiler v"+MiniGrace.version);
});
