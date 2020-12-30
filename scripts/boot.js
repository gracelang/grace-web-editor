"use strict";

var $ = require("jquery");

$(function () {
  var editor, files;

  files = require("./files").setup($("#file-tree"));
  editor = require("./editor").setup(files, $("#grace-view"), $("#image-view"), $("#audio-view"), $(".feedback"), $("#output-hide-reveal"));
  require("./sidebar").setup(editor, $("#left-sidebar"), $("#left-sidebar-resize"), $("#left-sidebar-hide-reveal"));
  require("./refactor").setup(editor, $("#refactor-view"));
  require("./settings").setup(editor, $("#settings-view"));

  $(document).keyup(function (event) {
    if (event.which === 49 && event.ctrlKey && event.shiftKey &&  // ctrl + shift + 1
        confirm("Are you sure you want to clear your local storage?  This will delete all of the files in the Grace IDE files tab.")) {
      localStorage.clear();
      document.location.reload(true);
    }
  });
});
