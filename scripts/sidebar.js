"use strict";

var $ = require("jquery");

require("setimmediate");

exports.setup = function (editor, sidebar, resize, hideReveal) {
  var isClicked, min, orig;

  isClicked = false;
  orig = sidebar.width();
  min = 135; //Minimum sidebar width

  function store() {
    localStorage.sidebarWidth = sidebar.width();
  }

  function update() {
    if (localStorage.sidebarMinned) {
      sidebar.width(min);
    } else {
      sidebar.width(localStorage.sidebarWidth);
    }

    editor.resize();
  }

  function toggle() {
    if (!localStorage.sidebarMinned &&
        parseInt(localStorage.sidebarWidth, 10) === min) {
      localStorage.sidebarWidth = orig;
    }

    if (localStorage.sidebarMinned) {
      delete localStorage.sidebarMinned;
    } else {
      localStorage.sidebarMinned = true;
    }

    update();
  }

  //Event binding to hide right-click menu
  $("*").click(function(e){
    var menu = document.querySelector(".context-menu");
    $(menu).hide();
  });

  //Delegate functions
  //Stop the menu from appearing when user right-clicks on files
  $("#file-tree").delegate(".file", "mousedown", function(e) {
    "use strict";
    var menu = document.querySelector(".context-menu");

    if (e.which == 3) {
      //Stop any parent function from being called by event
      e.preventDefault();
      e.stopPropagation();

      //Hide the right-click menu
      $(menu).hide();
    }
  });

  //Detect a right-click on a directory
  $("#file-tree").delegate(".directory-name", "mousedown", function(e){
    "use strict";
    var menu = document.querySelector(".context-menu");

    // If it's a right-click
    if(e.which == 3) {
      //Stop any parent function from being called by event
      e.preventDefault();
      e.stopPropagation();

      //Show the right-click menu at mouse coordinates
      $(menu).show();
      $(menu).offset({left: e.pageX, top: e.pageY});

      //Get the attribute of the parent list element, which has
      //the full directory name
      var directoryName = $(this).parent().attr("dire-name");
      var directoryObj = $(this).parent();

      //Store the parent Directory of the one the click event occured on
      var containingDir =  $(this).parent().parent().parent().parent();

      //Look for a matching directory in localStorage
      for (var i in localStorage) {
        if (i.startsWith("directory:") && ("directory:" + directoryName) === i) {

          //Store info the item that was clicked on for menu actions
          $("body").data('clickedDirectory', directoryName);
          $("body").data('directoryObj', directoryObj);
          $("body").data('containingDir', containingDir);
        }
      }
    }

    return false;
  });


  hideReveal.mouseup(function () {
    if (sidebar.hasClass("hide")) {
      sidebar.animate({
        width: localStorage.sidebarWidth + "px",
      }, 400, function() {
        editor.resize();
        sidebar.removeClass("hide");
        sidebar.css("display", "flex");
        hideReveal.html("<b>&#x276c;</b>");
      });
    } else {
      sidebar.animate({
        width: "0px",
      }, 400, function() {
        editor.resize();
        sidebar.addClass("hide");
        sidebar.css("display", "none");
        hideReveal.html("<b>&#x276D;</b>");
      });
    }
  });

  resize.mousedown(function () {
    isClicked = true;
  });

  $(document).mouseup(function () {
    isClicked = false;
  }).mousemove(function (event) {
    if (isClicked) {
      if (event.pageX <= min || sidebar.hasClass("hide")) {
        return false;
      }

      sidebar.width(event.pageX);
      editor.resize();

      // Recalculate the width here to account for min-width;
      store();

      return false;
    }
  }).keypress(function (event) {
    if ((event.which === 6 || event.which === 70) &&
        event.shiftKey && (event.ctrlKey || event.metaKey)) {
      toggle();
    }
  });

  if (localStorage.sidebarWidth) {
    update();
  } else {
    store();
  }

  $(".sidebar-buttons").on('mouseup', '*', function () {
    showSidebarView($(this).attr('value'));
  });

  function showSidebarView(view) {
    var refactorView = $("#refactor-view");
    var settingsView = $("#settings-view");
    var filesView = $("#files-view");

    var refactorButton = $("#show-refactor");
    var settingsButton = $("#show-settings");
    var filesButton = $("#show-files");

    if (view == "refactor") {
      refactorView.removeClass("hidden");
      settingsView.addClass("hidden");
      filesView.addClass("hidden");

      refactorButton.addClass("hidden");
      settingsButton.removeClass("hidden");
      filesButton.removeClass("hidden");
    } else if (view == "settings") {
      refactorView.addClass("hidden");
      settingsView.removeClass("hidden");
      filesView.addClass("hidden");

      refactorButton.removeClass("hidden");
      settingsButton.addClass("hidden");
      filesButton.removeClass("hidden");
    } else if (view == "files") {
      refactorView.addClass("hidden");
      settingsView.addClass("hidden");
      filesView.removeClass("hidden");

      refactorButton.removeClass("hidden");
      settingsButton.removeClass("hidden");
      filesButton.addClass("hidden");
    }
  }
};
