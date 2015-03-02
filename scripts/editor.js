/*jslint browser: true*/
/*globals $, Blob, URL, ace, confirm, minigrace*/

"use strict";

var compiler, feedback, intervals, path, timers, windows;

path = require("path");

require("setimmediate");

compiler = require("./compiler");
feedback = require("./feedback");

windows = [];
timers = [];
intervals = [];

exports.setup = function (files, view, fdbk) {
  var drop, download, editor, fileName, opening, rename, session;

  function stop() {
    windows.forEach(function (win) {
      win.close();
    });

    timers.forEach(function (tim) {
      clearTimeout(tim);
    });

    intervals.forEach(function (ter) {
      clearInterval(ter);
    });

    feedback.compilation.stop();
  }

  function checkStop() {
    if (windows.length === 0 &&
        timers.length === 0 && intervals.length === 0) {
      stop();
      return true;
    }

    return false;
  }

  global.checkStop = checkStop;

  global.graceRegisterWindow = function (win) {
    windows.push(win);
    win.addEventListener("unload", function () {
      windows.pop(win);
      checkStop();
    });
  };

  global.graceRegisterTimeout = function (timer) {
    timers.push(timer);
  };

  global.graceRegisterInterval = function (interval) {
    timers.push(interval);
  };

  download = view.find(".download");
  fileName = view.find(".file-name");
  drop = view.find(".delete");

  rename = view.find(".file-name-input");

  function setDownload(name, text) {
    download.attr("href", URL.createObjectURL(new Blob([text], {
      type: "text/x-grace"
    }))).attr("download", name);
  }

  editor = ace.edit(view.find(".editor")[0]);

  editor.setFontSize(14);

  session = editor.getSession();
  session.setUseSoftTabs(true);
  session.setTabSize(2);
  session.setMode("ace/mode/grace");

  //function gotoLine(line, column) {
    //editor.gotoLine(line, column - 1, true);
    //editor.focus();
  //}

  session.on("change", function () {
    var name, value;

    if (opening) {
      return;
    }

    name = fileName.text();
    value = session.getValue();

    if (files.isChanged(name, value)) {
      compiler.forget(name);
      stop();
      feedback.compilation.waiting();
    }

    setDownload(name, value);
    files.save(value);

    session.clearAnnotations();
  });

  editor.focus();

  feedback = feedback.setup(fdbk, function () {
    var modname, name;

    name = fileName.text();
    modname = path.basename(name, ".grace");

    compiler.compile(modname, session.getValue(), function (reason) {
      if (reason !== null) {
        feedback.error(reason);

        if (reason.module === name && reason.line) {
          session.setAnnotations([{
            row: reason.line - 1,
            column: reason.column && reason.column - 1,
            type: "error",
            text: reason.message
          }]);
        }
      } else {
        feedback.compilation.ready();
      }
    });
  }, function () {
    var escaped, modname;

    feedback.running();

    modname = path.basename(fileName.text(), ".grace");
    escaped = "gracecode_" + modname.replace("/", "$");

    global.gracecode_main = global[escaped];
    global.theModule = global[escaped];

    minigrace.lastSourceCode = editor.getValue();
    minigrace.lastModname = modname;
    minigrace.lastMode = "js";
    minigrace.lastDebugMode = true;

    minigrace.stdout_write = function (value) {
      feedback.output.write(value);
    };

    minigrace.stderr_write = function (value) {
      feedback.output.error(value);
      stop();
    };

    try {
      minigrace.run();
    } catch (error) {
      feedback.output.error(error.toString());
      stop();
    }

    if (!checkStop()) {
      return stop;
    }
  });

  files.onOpen(function (name, content) {
    var slashIndex = name.lastIndexOf("/");

    if (slashIndex !== -1) {
      name = name.substring(slashIndex + 1);
    } 
    
    fileName.text(name);
    setDownload(name, content);

    opening = true;
    session.setValue(content);
    opening = false;

    if (compiler.isCompiled(name)) {
      feedback.compilation.ready();
    } else if (compiler.isCompiling(name)) {
      feedback.compilation.building();
    } else {
      feedback.compilation.waiting();
    }

    view.removeClass("hidden");
    editor.focus();
  });

  drop.click(function () {
    if (confirm("Are you sure you want to delete this file?")) {
      files.remove();
      view.addClass("hidden");
      feedback.output.clear();
    }
  });

  function resize() {
    rename.attr("size", rename.val().length + 1);
  }

  fileName.click(function () {
    fileName.hide();
    rename.val(fileName.text()).css("display", "inline-block").focus();
    resize();
  });

  rename.change(function () {
    var name = rename.css("display", "none").val();
    fileName.show();
    files.rename(name);
  }).keypress(function (event) {
    if (event.which === 13) {
      rename.blur();
    } else {
      resize();
    }
  }).keydown(resize).keyup(resize);

  // Ace seems to have trouble with adjusting to flexible CSS. Force a resize
  // once the size settles.
  setImmediate(function () {
    editor.resize(true);
  });

  return editor;
};
