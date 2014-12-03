/*jslint browser: true*/
/*globals $, Blob, FileReader, URL, alert, atob, btoa, confirm, prompt*/

"use strict";

var path = require("path");

require("setimmediate");

exports.setup = function (tree) {
  var input, onOpenCallbacks, name, newFile, upload;

  input = $("#upload-input");
  upload = $("#upload");
  newFile = $("#new-file");

  onOpenCallbacks = [];

  function validateName(file) {
    if (file[0] === ".") {
      alert("File names must not begin with a dot.");
      return false;
    }

    if (!/^[\w.]+$/.test(file)) {
      alert("Only letters, dots, numbers, and underscores are allowed.");
      return false;
    }

    if (localStorage.hasOwnProperty("file:" + file)) {
      alert("That name is already taken.");
      return false;
    }

    return true;
  }

  function getName() {
    var file = prompt("Name of file:");

    if (file !== null && file.length > 0) {
      if (path.extname(file) === "") {
        file += ".grace";
      }

      if (!validateName(file)) {
        return getName();
      }

      return file;
    }

    return false;
  }

  function contents(name) {
    if (!localStorage.hasOwnProperty("file:" + name)) {
      throw new Error("No such file " + name);
    }

    return localStorage["file:" + name];
  }

  function onOpen(callback) {
    onOpenCallbacks.push(callback);
  }

  function openFile(name) {
    var content;

    if (!localStorage.hasOwnProperty("file:" + name)) {
      throw new Error("Open of unknown file " + name);
    }

    localStorage.currentFile = name;
    content = localStorage["file:" + name];

    onOpenCallbacks.forEach(function (callback) {
      callback(name, content);
    });
  }

  function save(content) {
    if (!localStorage.currentFile) {
      throw new Error("Save when no file is open");
    }

    localStorage["file:" + localStorage.currentFile] = content;
  }

  function rename(to) {
    var content, file;

    file = localStorage.currentFile;

    if (!file) {
      throw new Error("Rename when no file is open");
    }

    if (!to) {
      return;
    }

    if (path.extname(to) === "") {
      to += ".grace";
    }

    if (!validateName(to)) {
      return;
    }

    content = localStorage["file:" + file];
    delete localStorage["file:" + file];

    localStorage["file:" + to] = content;
    tree.find('[data-name="' + file + '"]').attr("data-name", to)
      .find(".file-name").text(to);
    localStorage.currentFile = to;

    openFile(to);
  }

  function remove() {
    var file = localStorage.currentFile;

    if (!file) {
      throw new Error("Remove when no file is open");
    }

    delete localStorage["file:" + file];
    tree.find('[data-name="' + file + '"]').remove();
    delete localStorage.currentFile;
  }

  function isChanged(name, value) {
    if (!localStorage.hasOwnProperty("file:" + name)) {
      throw new Error("Cannot compare change non-existent file " + name);
    }

    return localStorage["file:" + name] !== value;
  }

  function addFile(name) {
    var div, inserted, li;

    li = $("<li>");
    li.addClass("file");
    li.attr("data-name", name);

    div = $("<div>");
    div.addClass("file-name");
    div.text(name);

    li.append(div);

    if (path.extname(name) === ".grace") {
      li.addClass("grace");
    }

    inserted = false;

    tree.children().each(function () {
      if ($(this).text() > name) {
        $(this).before(li);
        inserted = true;
        return false;
      }
    });

    if (!inserted) {
      tree.append(li);
    }

    return li;
  }

  upload.click(function () {
    input.click();
  });

  function isText() {
    return true;
    //var ext = path.extname(name);

    //return ext === ".grace" || ext === ".txt" || ext === ".json" ||
      //ext === ".xml" || ext === ".js" || ext === ".html" || ext === ".xhtml";
  }

  input.change(function () {
    var i, l, file, fileName, fileNameList;

    function readFileList(currentFileName, currentFile){
      var reader = new FileReader();

      reader.onload = function (event) {
        var result = event.target.result;

        if (!isText(currentFileName)) {
          result = btoa(result);
        }

        localStorage["file:" + currentFileName] = result;
        addFile(currentFileName);
        openFile(currentFileName);
      };

      if (isText(currentFileName)) {
        reader.readAsText(currentFile);
      } else {
        reader.readAsBinaryString(currentFile);
      }
    }

    fileNameList = [];

    for (i = 0, l = this.files.length; i < l; i += 1) {
      file = this.files[i];
      fileName = file.name;

      if (path.extname(fileName) === ".grace") {
        if (!validateName(fileName)) {
          if (!confirm("Rename the file on upload?")) {
            continue;
          }

          fileName = getName();

          if (!fileName) {
            continue;
          }
        }
      }

      fileNameList[i] = fileName;
    }

    for (i = 0; i < l; i += 1) {
      if (fileNameList[i] !== undefined) {
        readFileList(fileNameList[i], this.files[i]);
      }
    }
  });

  newFile.click(function () {
    var file = prompt("Name of new file:");

    if (file !== null && file.length > 0) {
      if (path.extname(file) === "") {
        file += ".grace";
      }

      if (!validateName(file)) {
        file = getName();

        if (!file) {
          return;
        }
      }

      localStorage["file:" + file] = "";
      addFile(file).click();
    }
  });

  tree.on("click", ".file", function () {
    tree.children().removeClass("show-options");
    $(this).addClass("show-options");
  });

  tree.on("click", ".grace", function () {
    openFile($(this).find(".file-name").text());
  });

  for (name in localStorage) {
    if (localStorage.hasOwnProperty(name) &&
        name.substring(0, 5) === "file:") {
      addFile(name.substring(5));
    }
  }

  if (localStorage.hasOwnProperty("currentFile")) {
    setImmediate(function () {
      openFile(localStorage.currentFile);
    });
  }

  global.graceHasFile = function (name) {
    return localStorage.hasOwnProperty("file:" + name);
  };

  global.graceReadFile = function (name) {
    var data = localStorage["file:" + name];

    if (!isText(name)) {
      data = atob(data);
    }

    return URL.createObjectURL(new Blob([data]));
  };

  return {
    contents: contents,
    save: save,
    rename: rename,
    remove: remove,
    onOpen: onOpen,
    isChanged: isChanged
  };
};
