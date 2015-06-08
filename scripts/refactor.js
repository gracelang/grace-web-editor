"use strict";

var $ = require("jquery");

exports.setup = function (editor, view) {
  var reindentButton;

  reindentButton = view.find("#refactor-reindent");

  function stringRepeat(pattern, count) {
    if (count < 1) return '';
    var result = '';
    while (count > 1) {
        if (count & 1) result += pattern;
        count >>= 1, pattern += pattern;
    }
    return result + pattern;
  }

  function formatGrace(code) {
    // This needs more work, lots of edges cases are not covered
    var indentLevel = 0;
    var formattedCode = '';
    var lines = code.split("\n");

    for (var i = 0; i < lines.length; i++) { 
      var line = lines[i].trim();

      if (line != "\n") {
        var padding = '';

        if (line.indexOf("}") > -1) {
          indentLevel--;
        }

        for (var j = 0; j < indentLevel; j++) {
          padding += stringRepeat(' ', editor.session.getTabSize());
        }

        line = padding + line;

        if (line.indexOf("{") > -1) {
          indentLevel++;
        }
      }

      if (i + 1 != lines.length) {
        line += '\n';
      }

      formattedCode += line;
    }

    return formattedCode;
  }

  reindentButton.mouseup(function () {
    var code = editor.getSession().getValue();
    editor.getSession().setValue(formatGrace(code));
  });
}
