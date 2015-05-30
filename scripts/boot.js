"use strict";

var $ = require("jquery");

$(function () {
  var editor, files;

  files = require("./files").setup($("#file-tree"));
  editor = require("./editor").setup(files, $("#grace-view"), $(".feedback"), $("#output-hide-reveal"));
  require("./sidebar")
    .setup(editor, $("#left-sidebar"), $("#left-sidebar-resize"), $("#left-sidebar-hide-reveal"));

  $(document).keyup(function (event) {
    if (event.which === 49 && event.ctrlKey && event.shiftKey &&
        confirm("Are you sure you want to clear your local storage?")) {
      localStorage.clear();
      document.location.reload(true);
    }
  });
});
