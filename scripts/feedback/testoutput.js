// The test output system.
// TODO: Figure out syling of the list items
// TODO: Conditionally generate lines based on success/failure
"use strict";

var $ = require("jquery");

exports.setup = function (output) {
  var list;

  list = output.children("ul.test-style");

  function scroll() {
    output.scrollTop(0).scrollTop(output.children().last().position().top);
  }

  function newChunk(text) {
    return $("<p>").text(text);
  }

  function newListItem(text) {
    return $("<li>").text(text);
  }

  function newError(text) {
    return $("<p>").addClass("error").html($("<div>").text(text));
  }

  function newTrace() {
    return $("<ol>").addClass("trace");
  }

  function newTraceLine(text) {
    return $("<li>").text(text);
  }

  return {
    "addTestMethod": function (content) {
         $('#methodList').append($('<option>', { value : content }).text(content));
      scroll();
    },

    "removeTestMethod": function (content) {
         $("#methodList option[value=content]").remove();
      scroll();
    },

    "write": function (content) {
      $('#list').append($('<option>').text(content));
      scroll();
    },

    "clear": function () {
      $('#list').children().remove();
    },

    "error": function (error) {
      var location;

      if (typeof error === "string") {
        output.append(newError(error));
        return;
      }

      if (error.stack !== undefined) {
        location = error.stack;
      } else {
        location = '    in "' + error.module + '"';

        if (error.line !== null) {
          location += " (line " + error.line + ", column " + error.column + ")";
        }
      }

      output.append(newError(error.message)
        .append(newTrace().append(newTraceLine(location))));
    }
  };
};
