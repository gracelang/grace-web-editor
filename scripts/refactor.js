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

    function charCount(text, char) {
        return text.split(char).length - 1
    }

    function indentOf(text) {
        var length = text.length;
        for (var ix = 0; ix < length;  ix++) {
            if (text.charCodeAt(ix) != 32) return ix;
        }
        return 0;  // text is nothing but spaces
    }

    var tabSize = Number(editor.session.getTabSize());

    function formatGrace(code) {
        // Continuation lines cause headaches.  We can ignore all of the
        // original formatting *except* for the formatting that indicates
        // continuation lines.  This code assumes that any increase in
        // indentation not due to a change in brace level indicates a
        // continuation line.  It formats continuation lines in the output
        // using a continuaiton indent that is 2 spaces greater than tabSize.
        var braceDepth = 0;
        var continuationIndent = tabSize + 2;
        var formattedCode = '';
        var inContinuation = false;
        var prevIndent = 0;
        var prevBraceChange = 0;
        var lines = code.split("\n");
            // if there is a newline at the end of the code, there will
            // be a final blank line in the array lines.
        var length = lines.length;

        for (var i = 0; i < length; i++) {
            var line = lines[i];
            var trimmedLine = line.trim();
            if (trimmedLine === "") {
                // blank lines are a special case because they don't change
                // prevIndent or prevBraceChange, but do end continuations.
                inContinuation = false;
                if (i < (length - 1)) formattedCode = formattedCode + '\n';
            } else {
                var currentIndent = indentOf(line);
                var openBraces = charCount(trimmedLine, "{");
                var closeBraces = charCount(trimmedLine, "}");
                var currentBraceChange = openBraces - closeBraces;
                var startsWithClose = trimmedLine[0] === "}";

                var indentSize = tabSize * braceDepth;
                if (startsWithClose) indentSize = indentSize - tabSize;
                
                if (inContinuation) {
                    if (currentIndent < prevIndent) inContinuation = false;
                } else {
                    if ((currentIndent > prevIndent) && (prevBraceChange <= 0))
                        inContinuation = true;
                }
                if (inContinuation) {
                    indentSize = indentSize + continuationIndent;
                }

                braceDepth = braceDepth + currentBraceChange;
                var indentedLine = stringRepeat(' ', indentSize) + trimmedLine
                formattedCode = formattedCode + indentedLine + '\n';
                prevIndent = currentIndent;
                prevBraceChange = startsWithClose ? 1 : currentBraceChange;
            }
        }
        return formattedCode;
    }

    reindentButton.mouseup(function () {
        var code = editor.getSession().getValue();
        tabSize = Number(editor.session.getTabSize());
        editor.getSession().setValue(formatGrace(code));
    });
}
