"use strict";

var $, ace, audio, compiler, feedback, intervals, path, timers, windows;

$ = require("jquery");

ace = require("brace");
path = require("path");

require("brace/ext/searchbox");
require("setimmediate");

compiler = require("./compiler");
feedback = require("./feedback");

require("./ace/mode-grace");
require('brace/theme/ambiance');
require('brace/theme/chaos');
require('brace/theme/chrome');
require('brace/theme/clouds_midnight');
require('brace/theme/clouds');
require('brace/theme/cobalt');
require('brace/theme/crimson_editor');
require('brace/theme/dawn');
require('brace/theme/dreamweaver');
require('brace/theme/eclipse');
require('brace/theme/github');
require('brace/theme/idle_fingers');
require('brace/theme/katzenmilch');
require('brace/theme/kr_theme');
require('brace/theme/kuroir');
require('brace/theme/merbivore_soft');
require('brace/theme/merbivore');
require('brace/theme/mono_industrial');
require('brace/theme/monokai');
require('brace/theme/pastel_on_dark');
require('brace/theme/solarized_dark');
require('brace/theme/solarized_light');
require('brace/theme/terminal');
require('brace/theme/textmate');
require('brace/theme/tomorrow_night_blue');
require('brace/theme/tomorrow_night_bright');
require('brace/theme/tomorrow_night_eighties');
require('brace/theme/tomorrow_night');
require('brace/theme/tomorrow');
require('brace/theme/twilight');
require('brace/theme/vibrant_ink');
require('brace/theme/xcode');

windows = [];
timers = [];
intervals = [];
audio = [];

exports.setup = function (files, view, fdbk, hideReveal) {
  var download, drop, search, editor, fileName, opening, rename, session;

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

    audio.forEach(function (aud) {
      aud.pause();
    });

    feedback.compilation.stop();
  }

  function checkStop() {
    if (windows.length === 0 &&
        timers.length === 0 && intervals.length === 0 && audio.length === 0) {
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

  global.graceRegisterAudio = function (element) {
    audio.push(element);
  };

  download = view.find(".download");
  fileName = view.find(".file-name");
  search = view.find(".search");
  drop = view.find(".delete");

  rename = view.find(".file-name-input");
  
  function runProgram() {
    var escaped, modname;

    feedback.running();

    modname = path.basename(fileName.text(), ".grace");
    escaped = graceModuleName(modname);

    global.gracecode_main = global[escaped];
    global.theModule = global[escaped];

    minigrace.lastSourceCode = editor.getValue();
    minigrace.lastModname = modname;
    minigrace.lastMode = "js";
    minigrace.lastDebugMode = true;

    minigrace.stdout_write = function (value) {
      feedback.output.write(value);
      openOutputViewIfHidden();
    };

    minigrace.stderr_write = function (value) {
      feedback.output.error(value);
      openOutputViewIfHidden();
      stop();
    };

    try {
      minigrace.run();
    } catch (error) {
      feedback.output.error(error.toString());
      openOutputViewIfHidden();
      stop();
    }

    if (!checkStop()) {
      return stop;
    }
  }

  function setDownload(name, text) {
    download.attr("href", URL.createObjectURL(new Blob([ text ], {
      "type": "text/x-grace"
    }))).attr("download", name);
  }

  editor = ace.edit(view.find(".editor")[0]);
  editor.$blockScrolling = Infinity;

  session = editor.getSession();
  session.setUseSoftTabs(true);
  session.setMode("ace/mode/grace");

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
        openOutputViewIfHidden();

        if (reason.module === name && reason.line) {
          session.setAnnotations([ {
            "row": reason.line - 1,
            "column": reason.column && reason.column - 1,
            "type": "error",
            "text": reason.message
          } ]);
        }
      } else {
        feedback.compilation.ready();
        runProgram();
      }
    });
  }, function () {
      runProgram();
  });

  function openOutputViewIfHidden() {
    if (view.find("#output-view").hasClass("hide")) {
      toggleOutputView();
    }
  }

  function toggleOutputView() {
    var fileView = view.find(".open-file");
    var outputView = view.find("#output-view");
    var hideRevealIcon = view.find("#output-hide-reveal-icon");
    var shownFeedbackSize = 150;
    var hiddenFeedbackSize = 27;

    if (outputView.hasClass("hide")) {
      fdbk.css('min-height', shownFeedbackSize + 'px');

      fileView.animate({
        height: (view.height() - shownFeedbackSize) + "px",
      }, 400);

      outputView.animate({
        flexGrow: "1",
        padding: "8px",
        borderBottomWidth: "1pt",
      }, 400, function() {
        editor.resize();
        outputView.removeClass("hide");
        hideRevealIcon.html("<b>&#x276C;</b>");
      });
    } else {
      fdbk.css('min-height', hiddenFeedbackSize + 'px');
      fdbk.css('max-height', hiddenFeedbackSize + 'px');

      fileView.animate({
        height: (view.height() - hiddenFeedbackSize) + "px",
      }, 400);

      outputView.animate({
        flexGrow: "0",
        padding: "0px",
        borderBottomWidth: "0px",
      }, 400, function() {
        editor.resize();
        outputView.addClass("hide");
        hideRevealIcon.html("<b>&#x276D;</b>");
      });
    }
  }

  hideReveal.mouseup(function () {
    toggleOutputView();
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

  search.mouseup(function () {
    if (search.find(".label").html() == "Search") {
      editor.execCommand("find");
      search.find(".label").html("Replace");
    } else {
      editor.execCommand("replace");
      search.find(".label").html("Search");
    }
  });

  return editor;
};
