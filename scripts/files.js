"use strict";

var $, path;

$ = require("jquery");
path = require("path");

require("jquery-ui");
require("setimmediate");

exports.setup = function (tree) {
  var current, currentDirectory, dropDirectory, input,
      lastSelect, newFile, newDir, onOpenCallbacks, upload, deleteDir, renameDir;

  current = null;

  input = $("#upload-input");
  upload = $("#upload");
  newFile = $("#new-file");
  newDir = $("#new-dir");
  deleteDir = $("#deleteSelected");
  renameDir = $("#renameSelected");


  onOpenCallbacks = [];

  function isText(name) {
    var ext = path.extname(name);

    return ext === "" ||
    ext === ".grace" || ext === ".txt" || ext === ".json" ||
    ext === ".xml" || ext === ".js" || ext === ".html" || ext === ".xhtml";
  }

  function isImage(name) {
    var ext = path.extname(name);

    return ext === ".jpg" || ext === ".jpeg" ||
           ext === ".bmp" || ext === ".gif" || ext === ".png";
  }

  function isAudio(name) {
    var ext = path.extname(name);

    return ext === ".mp3" || ext === ".ogg" || ext === ".wav";
  }

  function mediaType(name) {
    var ext = path.extname(name);

    return ext === ".mp3" ? "audio/mpeg" :
           ext === ".ogg" ? "audio/ogg" : ext === ".wav" ? "audio/wav" : "";
  }

  function validateName(givenName, category, checkBuiltIn) {

    //Name that is used in local storage
    var fileStorageName = givenName; //Default with no directory

    //Generate the fileStorage name
    if (currentDirectory !== undefined) {
      fileStorageName = currentDirectory.attr("dire-name") + "/" + givenName;
    }

    //***** Name Error Checks Begin Here ********
    //Check if name begins with a dot
    if (givenName[0] === ".") {
      alert("Names must not begin with a dot.");
      return false;
    }

    //Check for slashes in the name -- not allowed
    if (givenName.indexOf("/") !== -1)
    {
      alert("Names cannot contain slashes.");
      return false;
    }

    //Check if this name already exists in localstorage
    if (localStorage.hasOwnProperty(category + ":" + fileStorageName)) {
      alert("That name is already taken.");
      return false;
    }

    //Change given name to check for the global variable
    givenName = path.basename(givenName, ".grace");

    //Check if this name is one of the built-in modules
    if (checkBuiltIn && typeof global[graceModuleName(givenName)] !== "undefined")
    {
      var result = confirm("\""+givenName + "\" is a built-in module. Are you sure you want to overwrite it?" +
          " Doing so could cause unpredictable behavior!");

      //If they don't want to overwrite the file, don't allow it to be created
      if(!result) { return false; }
    }
    //***** Name Error Checks End Here ********

    //If all checks pass, return true
    return true;
  }

  //Takes a full localStorage directory identifier, ex. (thisDir/thatDir)
  //and returns just the actual name ex. (thatDir)
  function parseDirName(toParse)
  {
    var name = toParse;
    var lastSlash = name.lastIndexOf("/");

    //Check for a slash in the name (-1 means not found)
    if(lastSlash !== -1)
    {
      //Remove everything before the slash
      name = name.substring(lastSlash+1);
    }

    return name;
  }

  function getName(lastName, category) {
    var catName = prompt("Name of " + category + ":");

    if (catName !== null && catName.length > 0) {
      if (path.extname(catName) === "") {
        catName += path.extname(lastName);
      }

      if (!validateName(catName, category, true)) {
        return getName(catName, category);
      }

      return catName;
    }

    return false;
  }

  function contents(fileName) {
    if (!localStorage.hasOwnProperty("file:" + fileName)) {
      throw new Error("No such file " + fileName);
    }

    return localStorage["file:" + fileName];
  }

  function onOpen(callback) {
    onOpenCallbacks.push(callback);
  }

  function openFile(fileName) {
    var audioTag, content, directory, imageTag, noChange, slashIndex;

    if (!localStorage.hasOwnProperty("file:" + fileName)) {
      throw new Error("Open of unknown file " + fileName);
    }

    noChange = false;

    if (currentDirectory !== undefined) {

      if (currentDirectory.hasClass("directory")) {

        if (currentDirectory.find("ul").css("display") === "none") {
          slashIndex = fileName.lastIndexOf("/");

          if (slashIndex !== -1) {
            directory = fileName.substring(0, slashIndex);
          }

          if (currentDirectory.attr("dire-name") === directory) {
            noChange = true;
          }
        }
      }
    }

    //Store real filename for editor error checking process
    localStorage.setItem("filePathName", fileName);

    if (!noChange) {
      if (lastSelect !== undefined) {
        lastSelect.css({ "font-weight": "", "color": "" });
      }

      tree.find('[data-name="' + fileName + '"]').css({
        "font-weight": "bold",
        "color": "#FF0000"
      });

      lastSelect = tree.find('[data-name="' + fileName + '"]');
    }

    slashIndex = fileName.lastIndexOf("/");

    //Check if there is a directory -- otherwise set to undefined.
    if (slashIndex !== -1) {
      directory = fileName.substring(0, slashIndex);
      currentDirectory = tree.find('[dire-name="' + directory + '"]');
    } else {
      currentDirectory = undefined;
    }

    localStorage.currentFile = fileName;
    content = localStorage["file:" + fileName];

    if (isText(fileName)) {
      $("#image-view").addClass("hidden");
      $("#audio-view").addClass("hidden");

      audioTag = document.querySelector("audio");
      audioTag.src = "";
      audioTag.type = "";

      onOpenCallbacks.forEach(function (callback) {
        callback(fileName, content);
      });
    } else if (isImage(fileName)) {
      $("#grace-view").addClass("hidden");
      $("#audio-view").addClass("hidden");
      $("#image-view").removeClass("hidden");

      audioTag = document.querySelector("audio");
      audioTag.src = "";
      audioTag.type = "";

      imageTag = document.querySelector("img");
      imageTag.src = content;
    } else if (isAudio(fileName)) {
      $("#grace-view").addClass("hidden");
      $("#image-view").addClass("hidden");
      $("#audio-view").removeClass("hidden");

      audioTag = document.querySelector("audio");
      audioTag.src = content;
      audioTag.type = mediaType(fileName);
    }
  }

  function save(content) {
    if (!localStorage.currentFile) {
      throw new Error("Save when no file is open");
    }

    localStorage["file:" + localStorage.currentFile] = content;
  }



  function rename(to) {
    var content, file, newDataName = to;

    //Load name of current file
    file = localStorage.currentFile;

    //If no file, throw an error
    if (!file) {
      throw new Error("Rename when no file is open");
    }

    if (!to) {
      return;
    }

    //Add a .grace extension if needed
    if (path.extname(to) === "") {
      to += ".grace";
    }

    //Validate the name
    if (!validateName(to, "file", true)) {
      return;
    }

    //Pull the "old name" file's content from localStorage
    content = localStorage["file:" + file];
    delete localStorage["file:" + file];

    //If there is a directory currently selected, put the file into that directory
    if (currentDirectory !== undefined) {
      newDataName = currentDirectory.attr("dire-name") + "/" + newDataName;
    }

    //Write the new file to local storage and add it's old content to it
    localStorage["file:" + newDataName] = content;

    //Replace the name in the file-tree on the webpage
    tree.find('[data-name="' + file + '"]').attr("data-name", newDataName);
    tree.find('[data-name="' + newDataName + '"]').find(".file-name").text(to);

    //Update the current file variable in local storage
    localStorage.currentFile = newDataName;

    //Open the new file in the ace editor
    openFile(newDataName);
  }

  //Allows the renaming of directories
  //Old name needed to find the directory being renamed
  //** "newName" is expected to have the full path to the directory**
  function renameDirectory(oldName, newName)
  {
    //var isEmpty = checkIfEmpty(oldName);
    var oldDir;
    oldDir = $("body").data("directoryObj");
    //Note: Check if the currently open file is in the directory being renamed!
    // if so, update the ace editor and localStorage.current file to make sure that everything
    //works ok

    //Check to make sure the
    if (!newName) {
      return;
    }

    //Add the new directory
    localStorage["directory:" + newName] = "";
    var newDir = addDirectory(newName, true).click();

    modifyChildren(oldDir, newDir);

    delete localStorage["directory:" + oldDir.attr("dire-name")];
    tree.find('[dire-name="' + oldDir.attr("dire-name") + '"]').remove();

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

  function removeDir(name)
  {
    //Check if deleting something valid...
    if (name == undefined) {
      alert("Oops! Can't delete this directory!");
      return;
    }

    //Reset currentDirectory to undefined -- since some
    //storing errors (in localStorage) can occur when new
    //directories are created after nested directories are deleted
    currentDirectory = undefined;

    //Remove from localStorage and from html tree
    delete localStorage["directory:" + name];
    tree.find('[dire-name="' + name + '"]').remove();
  }

  //Removes everything in localStorgae that begins with this directory ID
  function removeAllinDirectory(name)
  {
    var toCheckFile = "file:"+name+"/";
    var toCheckDir = "directory:"+name+"/";
    var editorFile = localStorage.getItem("currentFile");

    //Delete all files in directory -- look in localStorage
    for (var i in localStorage) {
      if (i.startsWith(toCheckFile)){

        //Get the filename for comparison...
        var fileName = i.substring(i.indexOf(":")+1);

        //Check if the current file is in the directory being deleted
        if(editorFile === fileName)
        {
          //Delete the current editor file
          delete localStorage.currentFile;

          //Hide the editor and reset currentDir, since we have deleted it...
          $(document).trigger("hideEditor");
        }

        //Delete the localStorage file
        delete localStorage[i];
      }
    }

    //Delete all directories in directory being deleted
    for (var i in localStorage) {
      if (i.startsWith(toCheckDir)) {
        //Delete the directory
        delete localStorage[i];
      }
    }
  }

  //Function to check if the directory is empty
  //Returns 1 if contains files, 2 if directories, 3 if both, 0 if empty
  function checkIfEmpty(name)
  {
    var hasFiles = false;
    var hasDirs = false;
    var toCheckFile = "file:"+name+"/";
    var toCheckDir = "directory:"+name+"/";

    //Check if it still contains files -- look in localStorage
    for (var i in localStorage) {
      if (i.startsWith(toCheckFile)){
          hasFiles = true;
          break; //since we know there is at least 1 file
      }
    }

    //Check if it still contains directories
    for (var i in localStorage) {
      if (i.startsWith(toCheckDir)) {
        hasDirs = true;
        break; //since we know there is at least 1 directory
      }
    }

    //Return 1,2, or 3 depending on situation
    if(hasFiles && hasDirs) {
      return 3;
    }else if(hasDirs) {
      return 2;
    }else if(hasFiles){
      return 1;
    }else {
      return 0;
    }
  }


  function isChanged(name, value) {
    if (!localStorage.hasOwnProperty("file:" + name)) {
     throw new Error("Cannot compare change non-existent file " + name);
    }

    return localStorage["file:" + name] !== value;
  }


  //Function to add a file to the user interface
  //file tree. Does NOT effect localStorage.
  function addFile(name) {
    var div, inserted, li, parent, slashIndex, parentDir;

    li = $("<li>");
    li.addClass("file");
    li.attr("data-name", name);

    div = $("<div>");
    div.addClass("file-name");

    slashIndex = name.lastIndexOf("/");

    if (slashIndex != -1){
      parentDir = name.substring(0, slashIndex);
      name = name.substring(slashIndex + 1);

      currentDirectory = tree.find('[dire-name="' + parentDir + '"]');
    }
    else{
      currentDirectory = undefined;
    }

    div.text(name);
    li.append(div);

    if (path.extname(name) === ".grace") {
      li.addClass("grace");
    }

    inserted = false;

    //Set to correct parent for data structure
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

    li.draggable({
      "revert": "invalid",
      "scroll": false,
      "helper": "clone",
      "appendTo": "body"
    });

    return li;
  }

  function dropFile(draggedFile, droppedDire) {
    var content, dir, draggedName, droppedName,
        name, slashIndex, storeCurrentDirectory, oldLocal;

    draggedName = draggedFile.attr("data-name");
    name = draggedName;
    slashIndex = draggedName.lastIndexOf("/");

    if (droppedDire !== tree) {
      droppedName = droppedDire.attr("dire-name");

      if (slashIndex !== -1) {
        dir = draggedName.substring(0, slashIndex);
        name = draggedName.substring(slashIndex + 1);
      }

      if (droppedName === dir) {
        return false;
      }
    } else {
      if (slashIndex === -1) {
        return false;
      }

      name = draggedName.substring(slashIndex + 1);
      droppedDire = undefined;
    }

    storeCurrentDirectory = currentDirectory;
    currentDirectory = droppedDire;

    if (!validateName(name, "file", false)) {
      name = getName(name, "file");

      if (!name) {
        return false;
      }
    }

    if (droppedDire !== undefined) {
      name = droppedName + "/" + name;
    }

    addFile(name);
    currentDirectory = storeCurrentDirectory;

    if (lastSelect !== undefined && lastSelect.attr("data-name") === draggedName) {
      lastSelect.css({ "font-weight": "", "color": "" });
      tree.find('[data-name="' + name + '"]').css({
        "font-weight": "bold",
        "color": "#FF0000"
      });

      lastSelect = tree.find('[data-name="' + name + '"]');
    }

    //Check if the file being moved is also the one being edited
    //-- update currentFile in localStorage
    if (localStorage.hasOwnProperty("currentFile")) {
      oldLocal = localStorage.getItem("currentFile");
      if(oldLocal === draggedName)
      {
        localStorage.setItem("currentFile",name);
      }
    }

    //Store real filename for editor error checking process
    localStorage.setItem("filePathName", name);

    content = localStorage["file:" + draggedName];
    delete localStorage["file:" + draggedName];
    tree.find('[data-name="' + draggedName + '"]').remove();
    localStorage["file:" + name] = content;

    return true;
  }


  //Function to add a directory to the user interface
  //file tree. Does NOT effect localStorage.
  function addDirectory(name) {
    var div, inserted, li, parent, slashIndex, ul, parentDir;

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
      parentDir =  name.substring(0, slashIndex);
      name = name.substring(slashIndex + 1);

      //Look for parent Dir...
      currentDirectory = tree.find('[dire-name="' + parentDir + '"]');
    }
    else {
      currentDirectory = undefined;
    }

    div.text(name);
    ul = $("<ul>");
    ul.css({ "display": "block" });

    div.append(ul);
    li.append(div);


    //Note: might want to always add to main directory for new folders.
    //Adding folder-in-folder can make it seem like new directories aren't being created!
    //Hence, the isNew variable, but implementing this across all functions can be hard...
    // - since this validateName is also used for nesting directories...

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

    li.draggable({
      "revert": "invalid",
      "scroll": false,
      "helper": "clone",
      "appendTo": "body"
    });

    li.droppable({
      "greedy": true,
      "scroll": false,
      "tolerance": "pointer",

      "drop": function (event, ui) {
        if (ui.draggable.hasClass("file")) {
          if (!dropFile(ui.draggable, li)) {
            ui.draggable.draggable("option", "revert", true);
          }
        } else if (ui.draggable.hasClass("directory") &&
                   !dropDirectory(ui.draggable, li)) {
          ui.draggable.draggable("option", "revert", true);
        }
      }
    });

    return li;
  }


  //This takes all sub-directories and files, transfering
  //them from one directory to another
  function modifyChildren(draggedDire, newDire) {
    draggedDire.children().children().children().each(function () {

      if ($(this).hasClass("file")) {
        dropFile($(this), newDire);

      } else if ($(this).hasClass("directory")) {
        dropDirectory($(this), newDire);
      }
    });
  }

  // Assigned, rather than declared, to make clear the circular use above.
  dropDirectory = function (draggedDire, droppedDire) {
    var content, dir, display, draggedName, droppedName,
        name, newDire, slashIndex, storeCurrentDirectory;

    draggedName = draggedDire.attr("dire-name");
    name = draggedName;
    slashIndex = draggedName.lastIndexOf("/");

    if (droppedDire !== tree) {
      droppedName = droppedDire.attr("dire-name");

      if (slashIndex !== -1) {
        dir = draggedName.substring(0, slashIndex);
        name = draggedName.substring(slashIndex + 1);
      }

      //Don't do anything if dropped onto self
      if (droppedName === dir) {
        return false;
      }

    } else {

      if (slashIndex !== -1) {
        name = draggedName.substring(slashIndex + 1);
      } else {
        return false;
      }

      droppedDire = undefined;
    }

    storeCurrentDirectory = currentDirectory;
    currentDirectory = droppedDire;

    if (!validateName(name, "directory", false)) {
      name = getName(name, "directory");

      if (!name) {
        return false;
      }
    }

    if (droppedDire !== undefined) {
      name = droppedName + "/" + name;
    }

    newDire = addDirectory(name, false);
    currentDirectory = storeCurrentDirectory;

    display = draggedDire.find("ul").css("display");
    newDire.children().children("ul").css({ "display": display });

    if (newDire.find("ul").css("display") === "block") {
      newDire.children(".icon").removeClass("close");
      newDire.children(".icon").addClass("open");
    }

    modifyChildren(draggedDire, newDire);

    if (currentDirectory !== undefined) {
      if (currentDirectory.attr("dire-name") === draggedName) {
        lastSelect.css({ "font-weight": "", "color": "" });
        newDire.children().css({ "font-weight": "bold", "color": "#FF0000" });
        newDire.children().find("*").css({ "color": "#000000" });
        newDire.children().find(".file").css({ "font-weight": "normal" });

        currentDirectory = newDire;
        lastSelect = newDire.find("*");
      }
    }

    content = localStorage["directory:" + draggedName];
    delete localStorage["directory:" + draggedName];
    tree.find('[dire-name="' + draggedName + '"]').remove();
    localStorage["directory:" + name] = content;

    return true;
  };

  upload.click(function () {
    input.click();
  });

  input.change(function () {
    var file, fileName, fileNameList, i, l, lastValid;

    function readFileList(currentFileName, currentFile) {
      var reader = new FileReader();

      reader.onload = function (event) {
        var result = event.target.result;

        try {
          localStorage["file:" + currentFileName] = result;
        } catch (err) {
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
      } else if (isImage(currentFileName) || isAudio(currentFileName)) {
        reader.readAsDataURL(currentFile);
      }
    }

    fileNameList = [];

    for (i = 0, l = this.files.length; i < l; i += 1) {
      file = this.files[i];
      fileName = file.name;

      if (!validateName(fileName, "file", true)) {
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

  function createFile() {
    var file = prompt("Name of new file:");

    if (file !== null && file.length > 0) {
      if (path.extname(file) === "") {
        file += ".grace";
      }

      if (!validateName(file, "file", true)) {
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
      if (!validateName(directory, "directory", false)) {
        directory = getName(directory, "directory");

        if (!directory) {
          return;
        }
      }
      if (currentDirectory !== undefined) {
        directory = currentDirectory.attr("dire-name") + "/" + directory;
      }

      localStorage["directory:" + directory] = "";
      addDirectory(directory, true).click();
    }
  }

  //Detect clicks for new files
  newFile.click(function () {
        createFile();
  });

  //Detect clicks for new directory
  newDir.click(function(){
      createDirectory();
  });

  deleteDir.click(function () {
    //Get the name of the directory to delete
    var toDelete = $("body").data('clickedDirectory');
    var isEmpty = checkIfEmpty(toDelete);

    //Confirm the deletion if not empty!
    if(isEmpty === 0)
    {
      //Remove the dir -- don't need to clean containing files
      removeDir(toDelete);
    }
    else if(isEmpty === 1 &&
        confirm("\""+toDelete+"\" contains files, which will also be deleted. Are you sure you want to continue?"))
    {
      //Delete and clean up all containing files
      removeDir(toDelete);
      removeAllinDirectory(toDelete);
    }else if(isEmpty === 2 &&
        confirm("\""+toDelete+"\" contains other empty directories in it. Are you sure you want to continue?"))
    {
      //Delete and clean up all containing files
      removeDir(toDelete);
      removeAllinDirectory(toDelete);
    }else if(isEmpty === 3 &&
        confirm("\""+toDelete+"\" contains files and sub-directories, all of which will be deleted. Are you sure you want to continue?"))
    {
      //Delete and clean up all containing files
      removeDir(toDelete);
      removeAllinDirectory(toDelete);
    }
  });

  renameDir.click(function () {
    //Get the name of the directory to rename
    var fullName = $("body").data('clickedDirectory');
    var simpleName = parseDirName(fullName);
    var path = "";
    var lastSlash = -1;
    var newName = prompt("Enter the new directory name:", simpleName);

    //Validate the name
    if (newName !== null && newName.length > 0) {
      if (!validateName(newName, "directory", false)) {
        newName = getName(newName, "directory");

        if (!newName) {
          return;
        }
      }
    }

    //Check for the last slash
    lastSlash = fullName.lastIndexOf("/");

    //Add the directory structure to new name
    if (lastSlash !== -1) {
      path = fullName.substring(0, lastSlash+1);
      newName = path + newName;
    }

    renameDirectory(fullName, newName);
  });


  tree.on("click", ".directory", function (e) {
    var dir, noChange, slashIndex;

    e.stopPropagation();
    current = $(this);
    noChange = false;

    if (currentDirectory !== undefined) {

      if (currentDirectory.hasClass("directory")) {

        if (currentDirectory.find("ul").css("display") === "none") {
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
        lastSelect.css({ "font-weight": "", "color": "" });
      }

      current.children().css({ "font-weight": "bold", "color": "#FF0000" });
      current.children().find("*").css({ "color": "#000000" });
      current.children().find(".file").css({ "font-weight": "normal" });

      currentDirectory = current;
      lastSelect = current.find("*");
    }

    if (current.find("ul").css("display") === "none") {
      current.children().children("ul").css({ "display": "block" });
      current.children(".icon").removeClass("close");
      current.children(".icon").addClass("open");

    } else if (current.find("ul").css("display") === "block") {
      current.children().children("ul").css({ "display": "none" });
      current.children(".icon").removeClass("open");
      current.children(".icon").addClass("close");
    }
  });

  tree.on("click", ".file", function (e) {
    e.stopPropagation();
    openFile($(this).attr("data-name"));
  });

  tree.on("click", function () {
    if (lastSelect !== undefined) {
      lastSelect.css({ "font-weight": "", "color": "" });
    }

    currentDirectory = undefined;
  });

  tree.droppable({
    "greedy": true,
    "scroll": false,

    "drop": function (event, ui) {
      if (ui.draggable.hasClass("file")) {

        if (!dropFile(ui.draggable, tree)) {
          ui.draggable.draggable("option", "revert", true);
        }

      } else if (ui.draggable.hasClass("directory")) {

        if (!dropDirectory(ui.draggable, tree)) {
          ui.draggable.draggable("option", "revert", true);
        }
      }
    }
  });

  (function () {
    var name;

    for (name in localStorage) {
      if (localStorage.hasOwnProperty(name) &&
          name.substring(0, 5) === "file:") {
        addFile(name.substring(5));
      }
      if (localStorage.hasOwnProperty(name) &&
          name.substring(0, 10) === "directory:") {
        addDirectory(name.substring(10), false);
      }
    }
  }());

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

    return URL.createObjectURL(new Blob([ data ]));
  };

  return {
    "contents": contents,
    "save": save,
    "rename": rename,
    "remove": remove,
    "deleteDir": deleteDir,
    "renameDir": renameDir,
    "onOpen": onOpen,
    "isChanged": isChanged
  };
};
