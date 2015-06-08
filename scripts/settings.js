"use strict";

var $ = require("jquery");

exports.setup = function (editor, view) {
  var themeOption, fontsizeOption, tabsizeOption, foldingOption, softwrapOption, highlightActiveOption, showHiddenOption, displayIndentGuidesOption, showGutterOption, outputView, defaultEditorSettings;

  themeOption = view.find("#theme");
  fontsizeOption = view.find("#fontsize");
  tabsizeOption = view.find("#tabsize");
  foldingOption = view.find("#folding");
  softwrapOption = view.find("#soft-wrap");
  highlightActiveOption = view.find("#highlight-active");
  showHiddenOption = view.find("#show-hidden");
  displayIndentGuidesOption = view.find("#display-indent-guides");
  showGutterOption = view.find("#show-gutter");

  outputView = document.getElementById('output-view');

  defaultEditorSettings = {
    theme: 'ace/theme/chrome',
    fontSize: 14,
    tabSize: 2,
    foldStyle: 'markbegin',
    wrap: 'off',
    highlightActiveLine: true,
    showInvisibles: false,
    displayIndentGuides: true,
    showGutter: true
  };

  // Load settings
  // Clojure because it only needs to be run once
  (function() {
    var theme, fontSize, tabSize, foldStyle, wrap, highlightActiveLine, showInvisibles, displayIndentGuides, showGutter;

    if (typeof localStorage.editorTheme === 'undefined') {
      localStorage.editorTheme = defaultEditorSettings.theme;
    }

    if (typeof localStorage.editorFontSize === 'undefined') {
      localStorage.editorFontSize = defaultEditorSettings.fontSize;
    }

    if (typeof localStorage.editorTabSize === 'undefined') {
      localStorage.editorTabSize = defaultEditorSettings.tabSize;
    }

    if (typeof localStorage.editorFoldStyle === 'undefined') {
      localStorage.editorFoldStyle = defaultEditorSettings.foldStyle;
    }

    if (typeof localStorage.editorWrap === 'undefined') {
      localStorage.editorWrap = defaultEditorSettings.wrap;
    }

    if (typeof localStorage.editorHighlightActiveLine === 'undefined') {
      localStorage.editorHighlightActiveLine = defaultEditorSettings.highlightActiveLine;
    }

    if (typeof localStorage.editorShowInvisibles === 'undefined') {
      localStorage.editorShowInvisibles = defaultEditorSettings.showInvisibles;
    }

    if (typeof localStorage.editorDisplayIndentGuides === 'undefined') {
      localStorage.editorDisplayIndentGuides = defaultEditorSettings.displayIndentGuides;
    }

    if (typeof localStorage.editorShowGutter === 'undefined') {
      localStorage.editorShowGutter = defaultEditorSettings.showGutter;
    }

    theme = localStorage.editorTheme;
    fontSize = localStorage.editorFontSize;
    tabSize = localStorage.editorTabSize;
    foldStyle = localStorage.editorFoldStyle;
    wrap = localStorage.editorWrap;
    highlightActiveLine = localStorage.editorHighlightActiveLine === 'true';
    showInvisibles = localStorage.editorShowInvisibles === 'true';
    displayIndentGuides = localStorage.editorDisplayIndentGuides === 'true';
    showGutter = localStorage.editorShowGutter === 'true';

    editor.setTheme(theme);
    editor.setFontSize(fontSize);
    editor.getSession().setTabSize(tabSize);
    outputView.style.fontSize = fontSize;
    editor.getSession().setFoldStyle(foldStyle);
    editor.setOption("wrap", wrap);
    editor.setHighlightActiveLine(highlightActiveLine);
    editor.setShowInvisibles(showInvisibles);
    editor.setDisplayIndentGuides(displayIndentGuides);
    editor.renderer.setShowGutter(showGutter);

    themeOption.find('option:eq(' + theme + ')').prop('selected', true);
    fontsizeOption.find('option:eq(' + fontSize + ')').prop('selected', true);
    tabsizeOption.find('option:eq(' + tabSize + ')').prop('selected', true);
    foldingOption.find('option:eq(' + foldStyle + ')').prop('selected', true);
    softwrapOption.find('option:eq(' + wrap + ')').prop('selected', true);
    highlightActiveOption.prop('checked', highlightActiveLine);
    showHiddenOption.prop('checked', showInvisibles);
    displayIndentGuidesOption.prop('checked', displayIndentGuides);
    showGutterOption.prop('checked', showGutter);
  })();

  themeOption.change(function() {
    editor.setTheme(this.value);
    localStorage.editorTheme = this.value;
  });

  fontsizeOption.change(function() {
    editor.setFontSize(this.value);
    outputView.style.fontSize = this.value;
    localStorage.editorFontSize = this.value;
  });

  tabsizeOption.change(function() {
    editor.getSession().setTabSize(this.value);
    localStorage.editorTabSize = this.value;
  });

  foldingOption.change(function() {
    editor.getSession().setFoldStyle(this.value);
    localStorage.editorFoldStyle = this.value;
  });

  softwrapOption.change(function() {
    editor.setOption("wrap", this.value);
    localStorage.editorWrap= this.value;
  });

  highlightActiveOption.change(function() {
    editor.setHighlightActiveLine(this.checked);
    localStorage.editorHighlightActiveLine = this.checked;
  });

  showHiddenOption.change(function() {
    editor.setShowInvisibles(this.checked);
    localStorage.editorShowInvisibles = this.checked;
  });

  displayIndentGuidesOption.change(function() {
    editor.setDisplayIndentGuides(this.checked);
    localStorage.editorDisplayIndentGuides = this.checked;
  });

  showGutterOption.change(function() {
    editor.renderer.setShowGutter(this.checked);
    localStorage.editorShowGutter = this.checked;
  });
}
