"use strict";

var $ = require("jquery");
var fileSystem = require("./fileSystem.js").setup();

exports.setup = function (editor, view) {

    var removeUnicodeButton,addUnicodeButton,reindentButton, downloadAllFiles;

    reindentButton = view.find("#refactor-reindent");
    removeUnicodeButton = view.find("#remove-unicode");
    addUnicodeButton = view.find("#add-unicode");
    downloadAllFiles = view.find("#download-all-files");

    //Re-indent event
    reindentButton.mouseup(function () {
        var code = editor.getSession().getValue();
        var tabSize = Number(editor.session.getTabSize());
        editor.getSession().setValue(formatGrace(code, tabSize));
    });

    //Button event to convert unicode into text
    removeUnicodeButton.mouseup(function () {
        var code = editor.getSession().getValue();
        editor.getSession().setValue(removeUnicode(code));
    });

    //Button event to convert text into unicode
    addUnicodeButton.mouseup(function () {
        var code = editor.getSession().getValue();
        editor.getSession().setValue(addUnicode(code));
    });

    //Function to download all files as a zip file
    downloadAllFiles.mouseup(function () {
        var zipName = "Grace-IDE-Archive-";
        var date = new Date();

        zipName= zipName + (date.getMonth()+1).toString()+"-"+date.getDate().toString()+"-"+date.getFullYear().toString();

        //Generate and download zip
        fileSystem.downloadZip(zipName, fileSystem.packageAllFiles());
    });
};

// Object with key & value pairs mapping text and unicode characters
const unicodeReplacements = {
    "≠":"!=",
    "≥":">=",
    "≤":"<=",
    "→":"->",
    "⟦":"[[",
    "⟧":"]]"
};

//**************** Unicode Removal Function ****************
function removeUnicode(text) {
    //Replace each unicode value with its ascii equivalent
    for (let uCh in unicodeReplacements) {
        const regEx = new RegExp(uCh, "g");
        text = text.replace(regEx, unicodeReplacements[uCh]);
    }
    return text;
}

//************ Text to Unicode Function  ************/
function addUnicode(text) {
    // Iterate over each key in textReplacements
    for (let Ch in unicodeReplacements) {
        const regEx = new RegExp(escapeRegExp(unicodeReplacements[Ch]), "g");
        text = text.replace(regEx, Ch);
    }
    return text;
}

// Helper function to escape special characters in string for regular expression
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


//**************** Re-Indentation Functions ****************
function stringRepeat(pattern, count) {
    if (count < 1) return '';
    var result = '';
    while (count > 1) {
        if (count & 1) result += pattern;
        count >>= 1, pattern += pattern;
    }
    return result + pattern;
};

function examineBraces(text) {
    let braceCount= 0;
    let inString= false;
    let prev= '\u0000';
    let unmatchedLeftBrace = false;
    for (let c of text) {
        if ((c === '"') && (prev !== '\\')) {
            inString= ! inString;
        } else if (! inString) {
            if ((c === '/') && (prev == '/')) {
                return {
                    braceCount: braceCount,
                    unmatchedLeftBrace: unmatchedLeftBrace
                };
            } else if (c === '{') {
                braceCount++; unmatchedLeftBrace= true;
            } else if (c === '}') {
                braceCount--; unmatchedLeftBrace= false;
            }
        }
        prev = c;
    };
    return {
        braceCount: braceCount,
        unmatchedLeftBrace: unmatchedLeftBrace
    };
};

function indentOf(text) {
    var length = text.length;
    for (var ix = 0; ix < length;  ix++) {
        if (text.charCodeAt(ix) != 32) return ix;
    }
    return 0;  // text is nothing but spaces
};

function formatGrace(code, tabSize) {
    // Continuation lines cause headaches.  We can ignore all of the
    // original formatting *except* for the formatting that indicates
    // continuation lines.  This code assumes that any increase in
    // indentation not due to a change in brace level indicates a
    // continuation line.  It formats continuation lines in the output
    // using a continuation indent that is 2 spaces greater than tabSize.
    var braceDepth = 0;
    var continuationIndent = tabSize + 2;
    var formattedCode = '';
    var inContinuation = false;
    var prevIndent = 0;
    var prevBraceChange = 0;
    var prevUnmatchedLeftBrace = false;
    var lines = code.split(/\n|\r\n?|\u2028/);  //split on any of the line endings
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
            const braceObj = examineBraces(trimmedLine);
            const currentBraceChange = braceObj.braceCount;
            if (typeof(currentBraceChange) === "undefined") debugger;
            var startsWithClose = trimmedLine.startsWith("}");

            var indentSize = tabSize * braceDepth;
            if (startsWithClose) indentSize = indentSize - tabSize;
            if (trimmedLine.startsWith("//")) {
                // a comment line; don't update variables
            } else {
                if (prevUnmatchedLeftBrace) {
                    inContinuation = false;
                }
                if (inContinuation) {
                    if ((currentIndent < prevIndent) || (prevBraceChange !== 0)) {
                        inContinuation = false;
                    }
                } else {
                    if ((currentIndent > prevIndent) && (prevBraceChange === 0)) {
                        inContinuation = true;
                    }
                }
                if (inContinuation) {
                    indentSize = indentSize + continuationIndent;
                }
                prevIndent = currentIndent;
                prevBraceChange = (startsWithClose ? 1 : 0) + currentBraceChange;
                prevUnmatchedLeftBrace = braceObj.unmatchedLeftBrace;
            }
            braceDepth = braceDepth + currentBraceChange;
            let indentedLine = stringRepeat(' ', indentSize) + trimmedLine
            formattedCode = formattedCode + indentedLine + '\n';
        }
    }
    return formattedCode;
};

