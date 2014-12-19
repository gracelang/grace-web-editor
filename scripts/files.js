/*jslint browser: true*/
/*globals $, Blob, FileReader, URL, alert, atob, btoa, confirm, prompt*/

"use strict";

var path = require("path");

require("setimmediate");

exports.setup = function (tree) {
  var input, onOpenCallbacks, name, newFile, upload, currentDirectory, lastSelect;
  
  input = $("#upload-input");
  upload = $("#upload");
  newFile = $("#new-file");

  onOpenCallbacks = [];

  function validateName(givenName, category) {
    if (givenName[0] === ".") {
      alert("Names must not begin with a dot.");
      return false;
    }

    if (!/^[\w.]+$/.test(givenName)) {
      alert("Only letters, dots, numbers, and underscores are allowed.");
      return false;
    }

    if (currentDirectory !== undefined) {
      givenName = currentDirectory.attr("dire-name") + "/" + givenName;
    }

    if (localStorage.hasOwnProperty(category + ":" + givenName)) {
      alert("That name is already taken.");
      return false;
    }

    return true;
  }

  function getName(lastName, category) {
    var name = prompt("Name of " + category + ":");

    if (name !== null && name.length > 0) {
      if (path.extname(name) === "") {
        name += path.extname(lastName);
      }

      if (!validateName(name, category)) {
        return getName(name, category);
      }

      return name;
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
    var content, slashIndex, dir, noChange;

    if (!localStorage.hasOwnProperty("file:" + name)) {
      throw new Error("Open of unknown file " + name);
    }

    noChange = false;

    if (currentDirectory !== undefined) {

      if (currentDirectory.hasClass("directory")) {

        if (currentDirectory.find("ul").css('display') === "none") {
          slashIndex = name.lastIndexOf("/");

          if (slashIndex !== -1) {
            dir = name.substring(0, slashIndex);
          } 

          if (currentDirectory.attr("dire-name") === dir) {
            noChange = true;
          }
        }
      }
    } 

    if (!noChange) {

      if (lastSelect !== undefined) {
        lastSelect.css({'font-weight': '', 'color': ''});
      }

      tree.find('[data-name="' + name + '"]').css({'font-weight': 'bold', 'color': '#FF0000'});
      lastSelect = tree.find('[data-name="' + name + '"]');
    }
    
    slashIndex = name.lastIndexOf("/");

    if (slashIndex !== -1) {
      dir = name.substring(0, slashIndex);
      currentDirectory = tree.find('[dire-name="' + dir + '"]');
    } else {
      currentDirectory = undefined;
    }
    
    localStorage.currentFile = name;
    content = localStorage["file:" + name];

    if (isText(name)) {
      $("#image-view").addClass("hidden");
      $("#audio-view").addClass("hidden");

      var audioTag = document.querySelector('audio');
      audioTag.src = "";
      audioTag.type = "";

      onOpenCallbacks.forEach(function (callback) {
        callback(name, content);
      });
    } else if (isImage(name)) {
      $("#grace-view").addClass("hidden");
      $("#audio-view").addClass("hidden");
      $("#image-view").removeClass("hidden");

      var audioTag = document.querySelector('audio');
      audioTag.src = "";
      audioTag.type = "";

      var imageTag = document.querySelector('img');
      imageTag.src = content;
    } else if (isAudio(name)) {
      $("#grace-view").addClass("hidden");
      $("#image-view").addClass("hidden");
      $("#audio-view").removeClass("hidden");

      var audioTag = document.querySelector('audio');
      audioTag.src = content;
      audioTag.type = mediaType(name);
    }
  }

  function save(content) {
    if (!localStorage.currentFile) {
      throw new Error("Save when no file is open");
    }

    localStorage["file:" + localStorage.currentFile] = content;
  }

  function rename(to) {
    var content, file;
    var newDataName = to;

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

    if (!validateName(to, "file")) {
      return;
    }

    content = localStorage["file:" + file];
    delete localStorage["file:" + file];

    if (currentDirectory !== undefined) {
      newDataName = currentDirectory.attr("dire-name") + "/" + newDataName;
    }

    localStorage["file:" + newDataName] = content;
    tree.find('[data-name="' + file + '"]').attr("data-name", newDataName);
    tree.find('[data-name="' + newDataName + '"]').find(".file-name").text(to);
    localStorage.currentFile = newDataName;

    openFile(newDataName);
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
    var div, inserted, li, parent, slashIndex;

    li = $("<li>");
    li.addClass("file");
    li.attr("data-name", name);

    div = $("<div>");
    div.addClass("file-name");

    slashIndex = name.lastIndexOf("/");

    if (slashIndex !== -1) {
      name = name.substring(slashIndex + 1);
    } 

    div.text(name);
    li.append(div);

    if (path.extname(name) === ".grace") {
      li.addClass("grace");
    }

    inserted = false;

    if (currentDirectory === undefined) {
      parent = tree;
    } else {
      parent = currentDirectory.children().children();
    }
    
    parent.children().each(function () {
      if ($(this).text() > name && $(this).hasClass("file")) {
        $(this).before(li);
        inserted = true;
        return false;
      }
    });
  
    if (!inserted) {
      parent.append(li);
    }

    return li;
  }

  function addDirectory(name) {
    var div, inserted, li, ul, parent, slashIndex;

    li = $("<li>");
    li.addClass("directory");
    li.attr("dire-name", name);

    div = $("<div>");
    div.addClass("icon");
    div.addClass("close");
    li.append(div);

    div = $("<div>");
    div.addClass("directory-name");

    slashIndex = name.lastIndexOf("/");

    if (slashIndex !== -1) {
      name = name.substring(slashIndex + 1);
    } 

    div.text(name);
    ul = $("<ul>");
    ul.css({'display': 'block'});

    div.append(ul);
    li.append(div);

    if (currentDirectory === undefined) {
      parent = tree;
    } else {
      parent = currentDirectory.children().children();
    }

    inserted = false;

    parent.children().each(function () {
      if ($(this).text() > name || $(this).hasClass("file")) {
        $(this).before(li);
        inserted = true;
        return false;
      }
    });
  
    if (!inserted) {
      parent.append(li);
    }

    return li;
  }

  upload.click(function () {
    input.click();
  });

  function isText(name) {
    var ext = path.extname(name);

    return ext === "" ||
    ext === ".grace" || ext === ".txt" || ext === ".json" ||
    ext === ".xml" || ext === ".js" || ext === ".html" || ext === ".xhtml";
  }

  function isImage(name) {
    var ext = path.extname(name);

    return ext === ".jpg" || ext === ".jpeg" || ext === ".bmp" || ext === ".gif" || ext === ".png";
  }

  function isAudio(name) {
    var ext = path.extname(name);

    return ext === ".mp3" || ext === ".ogg" || ext === ".wav";
  }

  function mediaType(name) {
    var ext = path.extname(name);
    var type = "";

    switch (ext) {
      case ".mp3":
        type = "audio/mpeg";
        break;
      case ".ogg":
        type = "audio/ogg";
        break;
      case ".wav":
        type = "audio/wav";
        break;
    }

    return type;
  }

  input.change(function () {
    var i, l, file, fileName, fileNameList, lastValid;

    function readFileList(currentFileName, currentFile){
      var reader = new FileReader();

      reader.onload = function (event) {
        var result = event.target.result;
        
        try {
          localStorage["file:" + currentFileName] = result;
        }
        catch (err) {
          console.error(err.message);
          return;
        }
        
        addFile(currentFileName);


        if (lastValid === currentFileName) {
          openFile(currentFileName);
        }
      };

      if (isText(currentFileName)) {
        reader.readAsText(currentFile);
      } else if (isImage(currentFileName) || isAudio(currentFileName)){
        reader.readAsDataURL(currentFile);
      }
    }

    fileNameList = [];

    for (i = 0, l = this.files.length; i < l; i += 1) {
      file = this.files[i];
      fileName = file.name;

        if (!validateName(fileName, "file")) {
          if (!confirm("Rename the file on upload?")) {
            continue;
          }

          fileName = getName(fileName, "file");

          if (!fileName) {
            continue;
          }
        }

      if (currentDirectory !== undefined) {
        fileName = currentDirectory.attr("dire-name") + "/" + fileName;
      }

      fileNameList[i] = fileName;
    }

    for (i = 0; i < l; i += 1) {
      if (fileNameList[i] !== undefined) {
        readFileList(fileNameList[i], this.files[i]);
        lastValid = fileNameList[i];
      }
    }
  });

  newFile.click(function () {
    var creation = prompt("New file or New directory?", "directory");

    if (creation !== null && creation.length > 0) {
      if (creation === "file") {
        createFile();
      } else if (creation === "directory") {
        createDirectory();
      } else {
        if (confirm("Only file and directory acceptable") === true){
          newFile.click();
        }
      }
    }
  });

  function createFile() {
    var file = prompt("Name of new file:");

    if (file !== null && file.length > 0) {
      if (path.extname(file) === "") {
        file += ".grace";
      }

      if (!validateName(file, "file")) {
        file = getName(file, "file");

        if (!file) {
          return;
        }
      }

      if (currentDirectory !== undefined) {
        file = currentDirectory.attr("dire-name") + "/" + file;
      }

      localStorage["file:" + file] = "";
      addFile(file).click();
    }
  }

  function createDirectory() {
    var directory = prompt("Name of new directory:");

    if (directory !== null && directory.length > 0) {
      if (!validateName(directory, "directory")) {
        directory = getName(directory, "directory");

        if (!directory) {
          return;
        }
      }

      if (currentDirectory !== undefined) {
        directory = currentDirectory.attr("dire-name") + "/" + directory;
      }

      localStorage["directory:" + directory] = "";
      addDirectory(directory).click();
    }
  }

  var noChange, slashIndex, dir;
  var current = null;

  tree.on("click", ".directory", function(e) {
    e.stopPropagation();
    current = $(this);
    noChange = false;

    if (currentDirectory !== undefined) {

      if (currentDirectory.hasClass("directory")) {

        if (currentDirectory.find("ul").css('display') === "none") {
          slashIndex = current.attr("dire-name").lastIndexOf("/");

          if (slashIndex !== -1) {
            dir = current.attr("dire-name").substring(0, slashIndex);
          } else {
            dir = current.attr("dire-name");
          }

          if (currentDirectory.attr("dire-name") === dir) {
            noChange = true;
          }
        }
      }
    } 

    if (!noChange) {
      if (lastSelect !== undefined) {
        lastSelect.css({'font-weight': '', 'color': ''});
      }

      current.children().css({'font-weight': 'bold', 'color': '#FF0000'});
      current.children().find("*").css({'color': '#000000'});
      current.children().find(".file").css({'font-weight': 'normal'});

      currentDirectory = current;
    }

    if (current.find("ul").css('display') === "none") {
      current.children().children("ul").css({'display': 'block'});
      current.children(".icon").removeClass("close");
      current.children(".icon").addClass("open");
        
    } else if (current.find("ul").css('display') === "block") {
      current.children().children("ul").css({'display': 'none'});
      current.children(".icon").removeClass("open");
      current.children(".icon").addClass("close");
    }

    lastSelect = current.find("*");
  });

  tree.on("click", ".file", function (e) {
    e.stopPropagation();
    var name = $(this).attr("data-name");
    openFile(name);
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



