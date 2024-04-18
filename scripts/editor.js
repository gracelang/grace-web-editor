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

exports.setup = function (files, view, imgView, audioView, fdbk, hideReveal) {
  var download, imgDownload, audioDownload, remove, search, editor, fileName, opening, rename,
      session, fileSystem, selection, textFileName, imgFileName, audioFileName,
      textRename, imgRename, audioRename, undoStacks, redoStacks, dirtyCounters;

  var Range = ace.acequire('ace/range').Range;
  fileSystem = require("./fileSystem.js").setup();

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

  //Download button
  download = view.find(".download");

  //File names
  textFileName = view.find(".file-name");
  imgFileName = imgView.find(".file-name");
  audioFileName = audioView.find(".file-name");

  //Rename fields
  rename = view.find(".file-name-input");
  textRename = rename;
  imgRename= imgView.find(".file-name-input");
  audioRename = audioView.find(".file-name-input");

  //Search and remove
  search = view.find(".search");
  remove = $(".delete");

  //Undo/Redo stacks for each file and dirty counters
  undoStacks = {};
  redoStacks = {};
  dirtyCounters = {};

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

    minigrace.stdin_read = function () {
        return minigrace.ask("Input");
    };
    minigrace.ask = function (question) {
        let result = window.prompt(question);
        if (result === null) result = "";
        return result;
    };
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
  selection = editor.selection;
  session.setUseSoftTabs(true);
  session.setMode("ace/mode/grace");

  //Adds character equivalencies to the editor
  //see function for more info
  setupCharacterEquivalencies(editor);

  //Event to trigger hiding of view if current file is deleted
  $(document).on("hideEditor", function () {
    view.addClass("hidden");
  });

  //Change event responder to keep track of cursor position
  selection.on("changeCursor", function(){
    var name, cursor, lastRow, lastColumn;
    //If file is in the process of being opened, ignore event
    if (opening) { return; }

    //Get filename to store cursor
    name = localStorage["currentFile"];

    //Get the cursor information
    cursor = editor.getCursorPosition();
    lastRow = cursor.row;
    lastColumn = cursor.column;

    //Store the cursor position
    fileSystem.storeLastCursorPosition(name,lastRow,lastColumn);
  });

  //Change event responder to keep track of code folding
  session.on("changeFold", function(){
    //Get the current filename
    var name = localStorage["currentFile"];
    if (opening) { return; }

    //Store all of the code folds for the file
    fileSystem.storeAllFolds(name, editor.session.getAllFolds());
  });

  //Happens every time any text is changed in the editor
  session.on("change", function () {
    var name, value, toCheck;

    //If the file is currently being loaded
    if (opening) { return; }

    name = fileName.text();
    toCheck = localStorage.getItem("filePathName");
    value = session.getValue();

    if (files.isChanged(toCheck, value)) {
      compiler.forget(name);
      stop();
      feedback.compilation.waiting();
    }

    setDownload(name, value);
    files.save(value);

    //Store all of the code folds for the file
    fileSystem.storeAllFolds(name, editor.session.getAllFolds());

    //Save undo/redo stack for current file
    const undoManager = editor.session.getUndoManager();
    undoStacks[name] = undoManager.$undoStack;
    redoStacks[name] = undoManager.$redoStack;
    dirtyCounters[name] = undoManager.dirtyCounter;

    session.clearAnnotations();
    clearMarkers(session);
  });

  //Respond to changes in the scroll position
  session.on("changeScrollTop", function(scrollTopPosition){
    //Get the current filename
    var name = localStorage["currentFile"];
    if (opening) { return; }

    //Set the scroll position
    fileSystem.storeScrollBarPosition(name,scrollTopPosition);
  });

  function wrapTo(str, len) {
    // returns a new string containing all of the words of str, but wrapped
    // with newlines so that no line is longer than len.
    if (str.length <= len) return str.trim();
    var currBreak = str.lastIndexOf(" ", len);
    if (currBreak === -1) currBreak = len;   // force a break if there is no space

    var trimmedPrefix = str.substring(0, currBreak).trim();
    return trimmedPrefix + "\n" + wrapTo(str.substring(currBreak+1), len);
  }

  feedback = feedback.setup(fdbk, function () {
    var modname, name;

    name = fileName.text();
    modname = path.basename(name, ".grace");

    compiler.compile(modname, session.getValue(), function (reason) {
      var startCol, endCol, endLine;
      if (reason !== null) {
        feedback.error(reason);
        openOutputViewIfHidden();

        if (reason.module === modname && reason.line) {
          var row = reason.line - 1;           // ace counts from 0
          var se = "Syntax error: ";
          var msg = reason.message;
          if (msg.startsWith(se)) {
              msg = msg.substr(se.length);
          }
          session.setAnnotations([ {
            "row": row,
            "column": reason.column,  // column ignored by ace!
            "type": "error",
            "text": wrapTo(msg, 80)
          } ]);
          editor.resize(true);  // to work-around an ACE bug; see
                     // https://groups.google.com/forum/#!topic/ace-discuss/Dyz8U2N16HQ
          editor.scrollToLine(row, true, true, function () {});
          var doubleRangeMatch, rangeMatch, numberMatch;
          if (doubleRangeMatch = reason.column.match( /^(\d+)-(\d+):(\d+)$/ )) {
            startCol = parseInt(doubleRangeMatch[1], 10) - 1; // ace uses 0-based column nrs
            endLine = parseInt(doubleRangeMatch[2], 10) - 1;  // and line nrs
            endCol = parseInt(doubleRangeMatch[3], 10);       // and excludes the endCol
            session.addMarker(new Range(row, startCol, endLine, endCol),
                              "syntax-error", "text");
          } else if (rangeMatch = reason.column.match( /^(\d+)-(\d+)$/ )) {
            startCol = parseInt(rangeMatch[1], 10) - 1; // ace uses 0-based column nrs
            endCol = parseInt(rangeMatch[2], 10);       // and excludes the endCol
            session.addMarker(new Range(row, startCol, row, endCol),
                              "syntax-error", "text");
          } else if (numberMatch = reason.column.match( /^(\d+)$/ )) {
            startCol = parseInt(numberMatch[1], 10) - 1; // ace uses 0-based column nrs
            endCol = startCol + 1;                       // and excludes the endCol
            session.addMarker(new Range(row, startCol, row, endCol),
                              "syntax-error", "text");
          }
        }
      } else {
        feedback.compilation.ready();
      }
    });
  }, runProgram);

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
        height: (view.height() - shownFeedbackSize) + "px"
      }, 400);

      outputView.animate({
        flexGrow: "1",
        padding: "8px",
        borderBottomWidth: "1pt"
      }, 400, function() {
        editor.resize();
        outputView.removeClass("hide");
        hideRevealIcon.html("<b>&#x276C;</b>");
      });
    } else {
      fdbk.css('min-height', hiddenFeedbackSize + 'px');
      fdbk.css('max-height', hiddenFeedbackSize + 'px');

      fileView.animate({
        height: (view.height() - hiddenFeedbackSize) + "px"
      }, 400);

      outputView.animate({
        flexGrow: "0",
        padding: "0px",
        borderBottomWidth: "0px"
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

  //Function executed to load a file into the web editor
  files.onOpen(function (name, content, type) {
    var slashIndex = name.lastIndexOf("/");
    var cursor = fileSystem.getLastCursorPosition(name);
    var folds = fileSystem.getStoredFolds(name);
    var scrollPos = fileSystem.getScrollBarPosition(name);
    var undoManager = editor.session.getUndoManager();

    //Look at the file type and set the tag globally
    if(type === "text"){ fileName = textFileName; rename = textRename; }
    else if(type === "image"){ fileName = imgFileName; rename = imgRename; }
    else { fileName = audioFileName; rename = audioRename; }

    if (slashIndex !== -1) {
      name = name.substring(slashIndex + 1);
    }

    fileName.text(name);
    fileName.show();
    rename.hide();

    //If the file is a text file -- open the editor
    if(type === "text") {
      opening = true;
      //Put the content of the file into the editor
      session.setValue(content);

      //Set the download value
      setDownload(name, content);

      //Restore code folds
      if(folds != undefined && folds.length != undefined && folds.length != false) {
        for(var i = 0; i < folds.length; i++) {
          editor.session.addFold("...",folds[i]);
        }
      }

      // initialize stacks and counter if not done yet
      if (undoStacks[name] == undefined) undoStacks[name] = [];
      if (redoStacks[name] == undefined) redoStacks[name] = [];
      if (dirtyCounters[name] == undefined) dirtyCounters[name] = 0;

      // grab undo/redo stack and dirty counter for file being opened
      undoManager.$undoStack = undoStacks[name];
      undoManager.$redoStack = redoStacks[name];
      undoManager.dirtyCounter = dirtyCounters[name];

      //Put the cursor in the correct place
      editor.gotoLine((cursor.row+1),(cursor.column+1), false);

      //Set the scroll position
      editor.session.setScrollTop(scrollPos);

      //Clear all markers and code-highlighting the editor
      session.clearAnnotations();
      clearMarkers(session);
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
    }
  });

  //Function to respond to a "Delete" button click
  remove.click(function () {
    files.confirmDelete("Are you sure you want to delete this file?", function () {
      files.remove();
      view.addClass("hidden");
      imgView.addClass("hidden");
      audioView.addClass("hidden");
      feedback.output.clear();
    });
  });

  function resize() {
    rename.attr("size", rename.val().length + 1);
  }

  textFileName.click(function(){
    startRename(textFileName)
  });
  imgFileName.click(function(){
    startRename(imgFileName)
  });
  audioFileName.click(function(){
    startRename(audioFileName)
  });

  textRename.change(function () {
    executeRename(textRename);
  }).keypress(function (event) {
    finishRename(event, textRename);
  }).keydown(resize).keyup(resize);

  imgRename.change(function () {
    executeRename(imgRename);
  }).keypress(function (event) {
    finishRename(event, imgRename);
  }).keydown(resize).keyup(resize);

  audioRename.change(function () {
    executeRename(audioRename);
  }).keypress(function (event) {
    finishRename(event, audioRename);
  }).keydown(resize).keyup(resize);

  //*********** Renaming Functions ************
  function startRename(fileName) {
    fileName.hide();
    rename.val(fileName.text()).css("display", "inline-block").focus();
    resize();
  }

  function executeRename(rename) {
    var name = rename.css("display", "none").val();
    fileName.show();
    files.rename(name);
  }

  function finishRename(event, rename) {
    if (event.which === 13) {
      rename.blur();
    } else {
      resize();
    }
  }
  // *******************************************

  // Ace seems to have trouble with adjusting to flexible CSS. Force a resize
  // once the size settles.
  setImmediate(function () {
    editor.resize(true);
  });

  search.mouseup(function () {
   toggleSearchReplace();
  });

  editor.commands.addCommand({
    name: 'myCommand',
    bindKey: {win: 'Ctrl-F',  mac: 'Command-F'},
    exec: function(editor) {
      toggleSearchReplace();
    }
  });

  //Function that toggles between the search and replace
  //functions of the ace editor
  function toggleSearchReplace() {
    if (search.find(".label").html() == "Search") {
      editor.execCommand("find");
      search.find(".label").html("Replace");
    } else {
      editor.execCommand("replace");
      search.find(".label").html("Search");
    }
  }

  function clearMarkers(session) {
      for (var mId in session.$frontMarkers) {
          if (session.$frontMarkers.hasOwnProperty) {
              session.removeMarker(mId);
          }
      }
      for (mId in session.$backMarkers) {
          if (session.$backMarkers.hasOwnProperty) {
              session.removeMarker(mId);
          }
      }
  }
  return editor;
};


// Supports Character Equivalencies
function setupCharacterEquivalencies(editor) {
  // creates new command keys to support automatic conversion between
  // != and ≠, for example. The 'replacements' object defines the conversions.

  var cursorMoved = false;  // variable to be set when the cursor moves
                            // after a character replacement occurs

  //Get ace from brace, from browserify
  var ace = require('brace');
  //Extract the Range functionality for use
  var Range = ace.acequire('ace/range').Range;

  var replacements =   {     // dictionary of digraph replacements in the editor
      "!=":"≠",
      ">=":"≥",
      "<=":"≤",
      "->":"→",
      "[[":"⟦",
      "]]":"⟧"
  };

  var undoReplace =  { };   // the inverse dictionary, to undo the original replacements
  var finalChars = [ ];     // the final character is the one that triggers the replacement

  for (var key in replacements) {
      var val = replacements[key];
      undoReplace[val] = key;
      var finalChar = key.slice(-1);
      if (! finalChars.includes(finalChar)) {
          finalChars.push(finalChar);
      }
  }

  //****** Add All Character Equivalancies ********//
  for (var i=0, sz=finalChars.length; i<sz; ++i) {
      addCharEq(finalChars[i]);
  }

  var bracket_replacements =   {     // dictionary of replacements for bracket clash in the editor
    "[[":"⟦",
    "]]":"⟧"
};
  function addCharEq(a) {

    editor.commands.addCommand({
      name: 'myCommand' + a,
      bindKey: { win: a, mac: a },
      exec: function (editor) {
        // Insert 'a' to support standard functionality
        editor.insert(a);

        cursorMoved = false; // To allow backspace replacement

        // Calculate the cursor position
        var cursor = editor.getCursorPosition();
        // Check if autoPair is enabled
        var autoPairActive = editor.getBehavioursEnabled();

        // Check if replacement is possible
        if (cursor.column >= 2) {
          // Get the word length and corresponding text range
          var wordlength = getHighlightedWordLength(editor);
          var replacementRange = new Range(cursor.row, cursor.column - wordlength - 2, cursor.row, cursor.column - wordlength);
          var leftText = editor.session.getTextRange(replacementRange);
          var rightText = editor.session.getTextRange(new Range(cursor.row, cursor.column, cursor.row, cursor.column + 2));

          if (bracket_replacements.hasOwnProperty(leftText) && bracket_replacements.hasOwnProperty(rightText)) {
            var leftReplacement = bracket_replacements[leftText];
            var rightReplacement = bracket_replacements[rightText];

            if (autoPairActive) {
              // Replace both sides of the word with ⟦ and ⟧
              editor.session.replace(new Range(cursor.row, cursor.column - wordlength - 2, cursor.row, cursor.column - wordlength), leftReplacement);
              editor.session.replace(new Range(cursor.row, cursor.column - 1, cursor.row, cursor.column + 1), rightReplacement);
              editor.navigateLeft(1);
            }
          }

          else if (leftText in replacements) {
                //Insert the matching symbol
                editor.session.replace(replacementRange, replacements[leftText]);
          }
        }
      },
      readOnly: false // false if this command should not apply in readOnly mode
    });
  }

  function getHighlightedWordLength(editor) {
    var selectionRange = editor.getSelectionRange();
    if (selectionRange.start.row === selectionRange.end.row) {
        // Single-line selection
        return selectionRange.end.column - selectionRange.start.column;
    } 
    // Multi-line selection, count the number of characters in each line
    var numLines = (selectionRange.end.row - selectionRange.start.row) + 1;
    var totalLength = 0;
    for (var i = 0; i < numLines; i++) {
        var lineLength = editor.session.getLine(selectionRange.start.row + i).length;
        if (i === 0) {
            // First line
            lineLength -= selectionRange.start.column;
        } else if (i === numLines - 1) {
            // Last line
            lineLength = selectionRange.end.column;
        }
        totalLength += lineLength;
    }
    return totalLength;
}  
  //****** BACKSPACE Command Key ********//
  editor.commands.addCommand({
    name: 'BACK',
    bindKey: {win: 'backspace',  mac: 'backspace'},
    exec: function(editor) {
      var cursor = editor.getCursorPosition();

      //Check if there is text here, then look for undoReplacement
      if (cursor.column >= 1) {
        var replacementRange = new Range(cursor.row, cursor.column-1, cursor.row, cursor.column);
        var text = editor.session.getTextRange(replacementRange);
        if (text in undoReplace && !cursorMoved) {
          editor.session.replace(replacementRange,undoReplace[text]);
          return true;  // signals overridden functionality
        }
      }
      return false;  // signals normal backspace functionality
    },
    readOnly: false // this command should not apply in readOnly mode
  });


  //****** Cursor Move Check ********//
  //Editor check to see if the cursor has moved
  //used to provide dynamic replacement functionality
  editor.getSession().selection.on('changeSelection', function(e) {
    cursorMoved = true;
  });

}
