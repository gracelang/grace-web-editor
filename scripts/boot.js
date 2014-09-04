/*jslint browser: true*/
/*globals $, confirm*/

"use strict";

$(function () {
  var editor, files;

  files = require("./files").setup($("#file-tree"));
  editor = require("./editor").setup(files, $(".view"), $(".feedback"));
  require("./sidebar")
    .setup(editor, $("#left-sidebar"), $("#left-sidebar-resize"));

  $(document).keypress(function (event) {
    if (event.which === 49 && event.ctrlKey && event.shiftKey &&
        confirm("Are you sure you want to clear your local storage?")) {
      localStorage.clear();
      document.location.reload(true);
    }
  });
});

