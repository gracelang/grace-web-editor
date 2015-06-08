"use strict";

var $ = require("jquery");

require("setimmediate");

exports.setup = function (editor, sidebar, resize, hideReveal) {
  var isClicked, min, orig, isHidden;

  isClicked = false;
  orig = sidebar.width();
  min = 88;

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

  hideReveal.mouseup(function () {
    if (sidebar.hasClass("hide")) {
      sidebar.animate({
        width: localStorage.sidebarWidth + "px",
      }, 400, function() {
        sidebar.removeClass("hide");
        hideReveal.html("<b>&#x276c;</b>");
      });
    } else {
      sidebar.animate({
        width: "0px",
      }, 400, function() {
        sidebar.addClass("hide");
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
