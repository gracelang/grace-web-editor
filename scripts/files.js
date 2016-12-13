"use strict";

var $, path;

$ = require("jquery");
path = require("path");

require("jquery-ui");
require("setimmediate");
require("sweetalert");
var fileSystem = require("./fileSystem.js").setup();

exports.setup = function (tree) {
  var current, currentDirectory, dropDirectory, input,
      lastSelect, newFile, newDir, onOpenCallbacks, upload, deleteDir, renameDir;
  var lastError; //Global for last error message sent
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

    function validateName(newName, category, checkBuiltIn, shouldAlert) {
        // returns true if newName is OK for a file; otherwise false.
        // shouldAlert is a boolean; true means to post an alert.
        // category is a string: "file" or "directroy"
        // if checkBuiltIn, then also check that there is no built-in module with newName

        return validateNameAndDestination(newName,currentDirectory, category, checkBuiltIn, shouldAlert);
    }

   function validateNameAndDestination(newName, destination, category, checkBuiltIn, shouldAlert) {
    // returns true if newName is OK for a file; otherwise false.
    // shouldAlert is a boolean; true means to post an alert.
    // category is a string: "file" or "directroy"
    // if checkBuiltIn, then also check that there is no built-in module with newName

    //Name that is used in local storage
    var fileStorageName = newName; //Default with no directory

    //Optional argument alert -- if not provided, shouldAlert=true
    if(shouldAlert === undefined)
      shouldAlert = true;

    //Generate the fileStorage name
    if (destination && destination.attr("dire-name")) {
      fileStorageName = destination.attr("dire-name") + "/" + newName;
    }

    //***** Name Error Checks Begin Here ********
    //Check if name begins with a dot
    if (newName[0] === ".") {
      if(shouldAlert)
        alert("Names cannot begin with a dot.");
      lastError = "Names cannot begin with a dot.";
      return false;
    }

    //Check for slashes in the name -- not allowed
    if (newName.indexOf("/") !== -1)
    {
      if(shouldAlert)
        alert("Names cannot contain slashes.");
      lastError = "Names cannot contain slashes.";
      return false;
    }

    //Check for this identifier explicitly in the directory structure
    if (localStorage.hasOwnProperty(category + ":" + fileStorageName)) {
      if(shouldAlert)
        alert("That name is already taken.");
      lastError = "That name is already taken.";
      return false;
    }

    //Check if this FILENAME already exists in localstorage - across all directories
    if(checkBuiltIn) { //Allow disabling of check - for drag and drop
      var tempName;
      for (tempName in localStorage) {
        if (tempName.startsWith("file:")) {
          //Remove the identifier and parse the name
          tempName = tempName.substring(5);
          tempName = parseSlashName(tempName);

          if (tempName === newName) {
            if (shouldAlert)
              alert("That file already exists in another folder!");
            lastError = "That file already exists in another folder!";
            return false;
          }
        }
      }
    }

    //Change given name to check for the global variable
    newName = path.basename(newName, ".grace");

    //Check if this name is one of the built-in modules
    if (checkBuiltIn && typeof global[graceModuleName(newName)] !== "undefined")
    {
      var result = confirm("\""+newName + "\" is a built-in module. Are you sure you want to overwrite it?" +
          " Doing so could cause unpredictable behavior!");
      lastError = "\""+newName + "\" is a built-in module.";

      //If they don't want to overwrite the file, don't allow it to be created
      if(!result) { return false; }
    }
    //***** Name Error Checks End Here ********

    //If all checks pass, return true
    return true;
  }

  //Takes a full localStorage directory identifier, ex. (thisDir/thatDir)
  //and returns just the actual name ex. (thatDir)
  function parseSlashName(toParse)
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

  function oldGetName(lastName, category) {
    var catName = prompt("Name of " + category + ":");

    if (catName !== null && catName.length > 0) {
      if (path.extname(catName) === "") {
        catName += path.extname(lastName);
      }

      if (!validateName(catName, category, true, true)) {
        return oldGetName(catName, category);
      }

      return catName;
    }

    return false;
  }

  function getName(lastName, category, toExecuteAfter) {

    //Upper case version of category
    var type = category.charAt(0).toUpperCase() + category.slice(1);
    if(lastName === undefined) {lastName = "Enter a name here..."}
    swal({
      title: "Rename "+type,
      text: "Enter a new "+category+" name:",
      type: "input",
      showCancelButton: true,
      closeOnConfirm: false,
      animation: "slide-from-top",
      inputPlaceholder: lastName
    }, function(inputValue) {
      //Check the input for problems
      if (inputValue === false) return false;

      //Check if there is input
      if (inputValue === "" || inputValue === null)
      {
        swal.showInputError("You need to enter a " + category + " name!");
        return false;
      }

      //Add an extension if needed
      if (path.extname(inputValue) === "")
      {
        inputValue += path.extname(lastName);
      }

      //Validate the name
      if (!validateName(inputValue, category, true, false))
      {
        swal.showInputError(lastError);
        return false;
      }

      //Execute other code before exiting -- pass it the new name
      toExecuteAfter(inputValue);

      swal.close();
      return true;
    });
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

  //Set the current file variable in localStorage
  function setCurrentFile(name)
  {
    if (localStorage.hasOwnProperty("currentFile"))
    {
      localStorage.currentFile = name;
    } else {
      localStorage.setItem("currentFile",name);
    }
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
    if (!validateName(to, "file", true, false)) {
      swal("Oops!", lastError, "error");
      return;
    }

    //Pull the "old name" file's content from localStorage
    content = localStorage["file:" + file];

    //Delete the file and it's compiled module on the Window object
    delete localStorage["file:" + file];
    delete global["gracecode_"+fileSystem.removeExtension(file)];

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
    var oldDir;
    oldDir = $("body").data("directoryObj");

    //Check to make sure the name is there
    if (!newName) {
      return;
    }

    //Check to make sure the name is different
    if(newName === oldName) {
      return;
    }

    //Add the new directory
    localStorage["directory:" + newName] = "";
    var newDir = addDirectory(newName, true).click();

    //In the future -- make this be a localstorage only function
    //that just uses addFile, and addDirectory to rebuild the UI file-tree
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
    delete global["gracecode_"+fileSystem.removeExtension(file)];
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

  //Function to check localStorage for any grace files
  function checkForFiles()
  {
    var found = false;

    //Check if any localStorage key begins with file:
    for (var i in localStorage) {
      if (i.startsWith("file:"))
      {
        found = true;
        return true;  //If a file is found - return true
      }
    }

    return found;
  }

  function isChanged(name, value) {
    if (!localStorage.hasOwnProperty("file:" + name)) {
     throw new Error("Cannot compare change non-existent file " + name);
    }

    return localStorage["file:" + name] !== value;
  }


  //Function to add a file to the user interface
  //file tree. Does NOT effect localStorage.
  // ** NEEDS directory path in name **
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

  //Dropped dir - directory to move file to
  //DraggedName - full
  function dropFile(draggedFile, droppedDire) {
    var content, originalDir, draggedName, droppedName, stableName,
        name, slashIndex, nameWithPath;

    //Full dragged name - can have dir path
    draggedName = draggedFile.attr("data-name");

    //Set file name - Name without a directory path
    name = draggedName;
    slashIndex = draggedName.lastIndexOf("/");
    originalDir = draggedName.substring(0, slashIndex);  //File's  directory; empty string if at top level

    //Check where file was dropped, and modify paths accordingly
    if (droppedDire !== tree) {
      droppedName = droppedDire.attr("dire-name");

      if (slashIndex !== -1) {
        originalDir = draggedName.substring(0, slashIndex);  //File's  directory
        name = draggedName.substring(slashIndex + 1); //File name
        stableName = name;
      }

      //If dragged in own directory
      if (droppedName === originalDir) {
        return false;
      }
    }
    else //If dropped onto base tree
    {
      //If not on tree, but no branch also
      if (slashIndex === -1) {
        return false;
      }

      //Reset name to basename -- no path!
      name = draggedName.substring(slashIndex + 1);
      stableName = name;
      droppedDire = null;
    }


    //Check for a duplicate name in this directory
    if (!validateNameAndDestination(name, droppedDire,"file", false, false)) {
      //Custom error - since any file in the file tree must have an otherwise valid filename
      alert("Oops! There is already a file with the same name here! Please rename the new file.");
      getName(name, "file", function reName(name){

      if (!name) {
        return false;
      }

    if (droppedDire) {
      nameWithPath = droppedName + "/" + name;
    } else {
      nameWithPath = name;
    }

    //Add file to UI file tree
    addFile(nameWithPath);

    //Modify the file's position in localStorage
    locStoreTransferFile(droppedName, originalDir, name, stableName);

    //Remove old file position from UI file tree
    tree.find('[data-name="' + draggedName + '"]').remove();

    //Add CSS and UI elements
    if (lastSelect !== undefined && lastSelect.attr("data-name") === draggedName) {
      lastSelect.css({ "font-weight": "", "color": "" });
      tree.find('[data-name="' + name + '"]').css({
        "font-weight": "bold",
        "color": "#FF0000"
      });

      lastSelect = tree.find('[data-name="' + name + '"]');
      }
   });

      //If we are not dealing with a re-name -- add normally
    } else {

      if (droppedDire) {
        nameWithPath = droppedName + "/" + name;
      } else {
        nameWithPath = name;
      }

      //Add file to UI file tree
      addFile(nameWithPath);

      //Modify the file's position in localStorage
      locStoreTransferFile(droppedName, originalDir, name, stableName);

      //Remove old file position from UI file tree
      tree.find('[data-name="' + draggedName + '"]').remove();

      //Add CSS and UI elements
      if (lastSelect !== undefined && lastSelect.attr("data-name") === draggedName) {
        lastSelect.css({ "font-weight": "", "color": "" });
        tree.find('[data-name="' + name + '"]').css({
          "font-weight": "bold",
          "color": "#FF0000"
        });

        lastSelect = tree.find('[data-name="' + name + '"]');
      }
    }
    return true;
  }


  // transfers a single file from one directory to another
  // in the localStorage file system
  // Directory arguments MUST have a FULL path in them
  // Just the name for the fileName args -- filenames can be same
  // oldFileName is optional; if present, this is a rename from oldFileName to newFileName
  function locStoreTransferFile(newDir, oldDir, newFileName, oldFileName)
  {
    var currentFile, fileNameWithPath, content;

    //Check for optional argument "oldFileName"
    if(! oldFileName) {
      oldFileName = newFileName;
    }

    //This adds the new directory path to the filename
    if (newDir) {
      fileNameWithPath = newDir + "/" + newFileName;
    } else {
      fileNameWithPath = newFileName;
    }

    //Create the filename with the old path, if needed
    if(oldDir) {
      // we are here if oldDir is defined and NOT the empty string
      oldFileName = oldDir + "/" + oldFileName;
    }

    //Check if the file being moved is also the one being edited
    //-- update currentFile in localStorage
    if (localStorage.hasOwnProperty("currentFile")) {
      currentFile = localStorage.getItem("currentFile");
      if (currentFile === oldFileName) {
        //Set the current file in the editor
        localStorage.setItem("currentFile", fileNameWithPath);

        //Store real filename for editor error checking process
        localStorage.setItem("filePathName", fileNameWithPath);
      }
    }

    //Move the actual content of the file
    content = localStorage["file:" + oldFileName];
    delete localStorage["file:" + oldFileName];
    localStorage["file:" + fileNameWithPath] = content;
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

    if (!validateName(name, "directory", false, false)) {
      alert("Oops! There is already a folder with the same name here! Please rename the new folder.");
      name = getName(name, "directory", function toRun(name){

      if (!name) {
        return false;
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

    tree.find('[dire-name="' + draggedName + '"]').remove();
    locStoreDirectoryTransfer(draggedName, name);
    });

   //If the name is valid -- continue as usual
} else {

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

        tree.find('[dire-name="' + draggedName + '"]').remove();
        locStoreDirectoryTransfer(draggedName, name);
      }
    return true;
  };

  //Function to transfer directory contents in localStorage
  //** Expects FULL directory path **
  function locStoreDirectoryTransfer(oldName, newName)
  {
    var content = localStorage["directory:" + oldName];
    delete localStorage["directory:" + oldName];
    localStorage["directory:" + newName] = content;
  }

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

      if (!validateName(fileName, "file", true, true)) {
        if (!confirm("Rename the file on upload?")) {
          continue;
        }

        //Rename on upload happens here
        fileName = oldGetName(fileName, "file");

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
    //Reset value to allow same-name uploads
    input.val("");
  });


  function createFile(filename) {
    swal({
      title: "New File",
      text: "Enter a filename:",
      type: "input",
      showCancelButton: true,
      closeOnConfirm: false,
      animation: "slide-from-top",
      inputPlaceholder: "A file name..."
    }, function(inputValue) {
      //Check the input for problems
      if (inputValue === false) return false;

      if (inputValue === "") {
        swal.showInputError("You need to enter a File name!");
        return false;
      }
      if (inputValue !== null && inputValue.length > 0) {
        if (path.extname(inputValue) === "") {
          inputValue += ".grace";
        }

        if (!validateName(inputValue, "file", true, false)) {
          swal.showInputError(lastError);
          return false;
        }

        if (currentDirectory !== undefined) {
          inputValue = currentDirectory.attr("dire-name") + "/" + inputValue;
        }

        localStorage["file:" + inputValue] = "";
        addFile(inputValue).click();
        swal.close();
      }
      return true;
    });
  }

  function createDirectory() {
    swal({
      title: "New Folder",
      text: "Enter a folder name:",
      type: "input",
      showCancelButton: true,
      closeOnConfirm: false,
      animation: "slide-from-top",
      inputPlaceholder: "A folder name..."
    }, function(inputValue) {
      //Check the input for problems
      if (inputValue === false) return false;

      if (inputValue === "") {
        swal.showInputError("You need to enter a folder name!");
        return false;
      }
      if (inputValue !== null && inputValue.length > 0) {
        if (!validateName(inputValue, "directory", false, false)) {
          swal.showInputError(lastError);
          return false;
        }
        if (currentDirectory !== undefined) {
          inputValue = currentDirectory.attr("dire-name") + "/" + inputValue;
        }

        localStorage["directory:" + inputValue] = "";
        addDirectory(inputValue, true).click();
        swal.close();
      }
      return true;
    });
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
    var message = "";

    //Confirm the deletion if not empty!
    if(isEmpty === 0)
    {
      //Remove the dir -- don't need to clean containing files
      removeDir(toDelete);
    }
    else if(isEmpty === 1) {message = "\""+toDelete+"\" contains files, which will also be deleted. Are you sure you want to continue?"}
    else if(isEmpty === 2) {message = "\""+toDelete+"\" contains other empty directories in it. Are you sure you want to continue?"}
    else if(isEmpty === 3) {message = "\""+toDelete+"\" contains files and sub-directories, all of which will be deleted. Are you sure you want to continue?"}

    //Check if we need to confirm directory deletion
    if(isEmpty !== 0) {
      confirmDelete(message, function () {
        //Delete and clean up all containing files
        removeDir(toDelete);
        removeAllinDirectory(toDelete);
      });
    }
  });

  function confirmDelete(message,toExecAfter)
  {
    swal({
      title: "Are you sure?",
      text: message,
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DD6B55",
      confirmButtonText: "Yes, delete it!",
      closeOnConfirm: false },
      function() {
        //Execute code passed to delete file/directory
        toExecAfter();
        //Close the alert when done
        swal.close();
      });
  }

  renameDir.click(function () {
    //Get the name of the directory to rename
    var fullName = $("body").data('clickedDirectory');
    var simpleName = parseSlashName(fullName);
    var path = "";
    var lastSlash = -1;

    //Switch the current directory to the parent dir
    //of the directory being renamed - for validateName
    var parent = $("body").data('containingDir');

    getName(simpleName, "directory", function finish(newName) {

        //If same name as now -- return
        if (newName === simpleName)
        {
          return;
        }

        //If no new name entered
        if (!newName) {
          return;
        }

    //Check for the last slash
    lastSlash = fullName.lastIndexOf("/");

    //Add the directory structure to new name
    if (lastSlash !== -1) {
      path = fullName.substring(0, lastSlash + 1);
      newName = path + newName;
    }

      //Rename the directory then restore the actual current directory
      renameDirectory(fullName, newName);
   })
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

    //If there are no grace files -- load the welcome file
    if(checkForFiles() == false)
    {
      //Get the welcome file and put it in localStorage
      $.get("style/Welcome.grace", function (data){
        localStorage.setItem("file:Welcome.grace", data);

        //Set it as the current file, add it to the file tree and open it
        setCurrentFile("Welcome.grace");
        addFile("Welcome.grace");
        openFile("Welcome.grace");
      }).fail(function () { //Just in case something happens...
        alert("Welcome to the Grace Web Editor!");
      });
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
    "isChanged": isChanged,
    "confirmDelete": confirmDelete
  };
};
