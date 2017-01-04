"use strict";

// Framework for the IDE to make it easier to work with LocalStorage and make the code more readable.
// This is intended as a complete API for the file system, and can be expanded as needed. Currently,
// the functionality provided here is used in "files.js" and "editor.js." Both files use it to interact with
// localStorage to store and retrieve files and their data.
// Functionality includes:
//  - Add/Remove folders and files
//  - Check if a folder/file exists
//  - Store attributes for files
//  - String parsing functions
var JSZip, fileSaver, ace, Range;
JSZip = require("jszip");
fileSaver = require("filesaver.js");
ace = require("brace");
Range = ace.acequire('ace/range').Range;

exports.setup = function () {

    //Global Variables
    const validExtensions = [".grace", ".txt", ".json", ".xml", ".js", ".html", ".xhtml",
        ".jpg", ".jpeg", ".bmp", ".gif", ".png", ".mp3", ".ogg", ".wav"];

    ///****************** Local Storage Functions ****************************
    //Function to add a file
    function addFile(filename) {
        //Format the name
        filename = formatName(filename,"file");

        //Add it to local storage
        localStorage[filename] = "";
    }

    //Function to delete file from localStorage
    //Expects full file-url from file-tree
    function deleteFile(filename) {
        //Parse the identifier as a precaution
        filename = removeIdentifier(filename);

        //Delete the file from localStorage
        delete localStorage["file:" + filename];

        //Delete the file's data
        deleteFileData(filename);

        //Make sure the filename is parsed for compiled version deletion
        filename = parseSlashName(removeExtension(filename));

        //Delete any compiled code loaded to the page
        delete global["gracecode_" + filename];
    }

    //A function to update the filename of a file
    //Called on rename or on a drag/drop to a folder
    function modifyFilePath(oldFileName,newFileName) {
        var content;

        //1 - Rename File
        content = localStorage[formatName(oldFileName,"file")];
        localStorage[formatName(newFileName,"file")] = content;

        //2 - Rename File Data (if it exists)
        content = getFileData(oldFileName);
        if(content) {setFileData(newFileName,content);}

        //3 - Delete all the pieces of old file
        deleteFile(oldFileName);
    }

    //Function to check if a file exists in a folder
    function checkFileInFolder(dirName, filename) {
        dirName = removeIdentifier(dirName);
        var toCheck = "file:"+dirName+"/";
        var tempName;
        for (tempName in localStorage) {
            if (tempName.startsWith(toCheck)) {
                //Parse the name
                tempName = parseSlashName(tempName);

                //If the parsed name contains the file name- we have a match
                return (tempName.includes(filename));
            }
        }
        //Default return value of false
        return false;
    }

    ///****************** Download Functions ****************************

    //A function that takes everything in localStorage, that
    //is a file or a folder and places it into a JSZip object for download
    function packageAllFiles() {
        var zip = new JSZip();
        var identifier;

        for (identifier in localStorage) {
            if (identifier.startsWith("file:")) {
                zip.file(identifier.substring(5), localStorage[identifier]);
            }
            if (identifier.startsWith("directory:")) {
                zip.folder(identifier.substring(10));
            }
        }
        return zip;
    }


    //This function packages a given folder, with all its files and
    //subdirectories into a JSZip object, and then returns this object
    // -- To download the ".zip" file, use .generateAsync and fileSaverJS
    // -- Function expects a full name with a path to the directory
    function packageFolder(fullName)
    {
        fullName = removeIdentifier(fullName);
        var zip = new JSZip();
        var localFolder = zip.folder(fullName);
        var identifier;

        for (identifier in localStorage) {
            if (identifier.startsWith("file:") &&
                identifier.includes(fullName)) {
                localFolder.file(identifier.substring(5), localStorage[identifier]);
            }
            if (identifier.startsWith("directory:") &&
                identifier.includes(fullName)) {
                localFolder.folder(identifier.substring(10));
            }
        }
        return zip;
    }

    //Download a ".zip" file given a filename and a JSZip Object.
    //Should save zip file to downloads folder
    function downloadZip(name, zipObject)
    {
        zipObject.generateAsync({type:"blob"}).then(function (blob) {
                fileSaver.saveAs(blob, name+".zip");
            });
    }

    ///****************** Directory UI Functions ****************************

    //This function sets the localStorage marker for an open or closed directory
    //Setter function for this storage method
    //Full-Path Name
    function setDirectoryStatus(name, status) {
        var storeStatus = "closed";

        //Set the status to be stored, otherwise, store as closed
        if(status === "open") {
            storeStatus = "open";
        }

        //Format the name correctly
        name = formatName(name, "directory");

        //Update Local Storage
        localStorage[name] = storeStatus;
    }

    //This function retrieves the status of a directory
    //If undefined, it returns a default "closed" status //True = open //False = closed
    //Expects a full path name
    function getDirectoryStatus(name) {
        var status;

        //Format the name correctly
        name = formatName(name, "directory");

        //Get the status
        status = localStorage[name];

        //Return the appropriate status
        if(status === undefined || status === "closed" || status == false){
            return false;
        } else {
            return true;
        }
    }


    //************** String functions *******************

    //Function to remove an extension from string
    //Looks for last ".", remove everything after that
    function removeExtension (filename) {
        //Find the extension
        var extPosition = filename.lastIndexOf(".");

        //If there is an extension
        if(extPosition !== -1) {
            return filename.substring(0,extPosition);
        } else {
            return filename; //Else return filename as is
        }
    }

    //Function to add a .grace extension to string
    function addExtension(filename) {

        //Check if there already is a ".grace" extension
        if(!(hasExtension(filename))){
            filename = filename + ".grace";
        }

        //If extension already exists, we just return string without any changes
        return filename;
    }

    //Function to check if a string has an extension
    function hasExtension(filename) {
        var lastPeriod = filename.lastIndexOf(".");

        //Check if no extension -- then we're ok
        return (lastPeriod !== -1);
    }

    function getExtension(filename) {
        var lastPeriod = filename.lastIndexOf(".");

        //Check if no extension -- then we're ok
        if(lastPeriod === -1) return true;

        //Simplify the argument
        filename = filename.substring(lastPeriod);

        //Return the extension of the filename
        return filename;
    }

    //Returns whether an extension is valid or not,
    // true = valid // false = invalid
    function validateExtension(filename) {
        var lastPeriod = filename.lastIndexOf(".");

        //Check if no extension -- then we're ok
        if(lastPeriod === -1) return true;

        //Simplify the argument
        filename = filename.substring(lastPeriod);

        //Check if it is a valid extension
        return validExtensions.includes(filename);
    }

    //************** File-Data Functions Functions *******************
    // A suite of functions to provide a way to store data about files in the editor
    // Uses JSON to store objects as strings in localStorage

    // ***** CURSOR ****
    //Functions to get and set the cursor position for a file
    function storeLastCursorPosition(filename,row,column) {
        storeAttributeForFile(filename,"cursorRow",row);
        storeAttributeForFile(filename,"cursorCol",column);
    }

    function getLastCursorPosition(filename) {
        //Cursor object to return data
        var cursor = {};

        //Retrieve the data
        cursor.row = getAttributeForFile(filename, "cursorRow");
        cursor.column = getAttributeForFile(filename, "cursorCol");

        //Check the data, if unusable, set to 0
        if (cursor.row == undefined || cursor.column == undefined) {
            cursor.row = 0;
            cursor.column = 0;
        }
        return cursor;
    }

    // ***** SCROLL BAR ****
    //Functions to get and set the scroll bar position
    function storeScrollBarPosition(filename, scrollPos) {
        storeAttributeForFile(filename,"scrollPos",scrollPos);
    }

    function getScrollBarPosition(filename) {
        //Get and check position for errors
        var scroll = getAttributeForFile(filename, "scrollPos");

        //If error - reset to 0
        if(scroll === undefined){
            return 0;
        } else {
            return scroll;
        }
    }

    // ***** CODE FOLDS ****
    //Stores all of the folded code in a file, when given the
    //object returned by the Ace editor with the command: editor.session.getAllFolds();
    //Note: Each time this is called, it re-writes the fold object from scratch.
    //Given the limited functionality of knowing when a fold is removed, it could be harder
    //to do individual checks
    function storeAllFolds(filename, aceFolds) {
        var folds, toAdd;

        //Initialize the folds object
        folds = [];

        //For each fold range, add a fold object to the fileStore
        for(var i in aceFolds)
        {
            if(aceFolds[i] != undefined && aceFolds[i].range != undefined && aceFolds[i] != false)
            {
                folds = addFold(folds, aceFolds[i].range);
            }
        }

        //Store the object
        storeAttributeForFile(filename,"folds",folds);
    }

    //Stores the fold range for a filename
    //Uses, Ace editor's fold class
    function addFold(folds,range) {
        var toAdd;

        //Initialize the fold we are adding
        toAdd = new aceFold();
        toAdd.loadFromRange(range);

        //If folds has not yet been created, use an empty object
        if(folds == undefined){folds=[]}

        //Check if fold is already there
        for(var i in folds){
            if(i["startRow"] != undefined && i["startRow"] != false) {
                //If we find an identical one, we stop looking
                if(i.isSame(toAdd)){
                    return folds;
                }
            }
        }
        //If not, add it --
        //If we get to here, it means that none of the above matched
        folds.push(toAdd);
        return folds;
    }

    //Returns an object with all of the stored folds for a file
    function getStoredFolds(filename) {
        //Search for the folds
        var folds = getAttributeForFile(filename,"folds");

        //Check for validity -- if undefined, return here
        if(folds === undefined) { return {}; }

        //Turn each of the attributes into actual aceFold objects
        for(var i in folds) {
            folds[i] = convertToRange(folds[i]);
        }

        //Check for return
        if(folds != false) {
            return folds;
        } else {
            return {};
        }
    }

    function storeAttributeForFile(filename,key,data) {
        var fileData;

        //See if the file has any current data stored
        fileData= getFileData(filename);

        //If no data stored, initialize a new object
        if(!fileData) {fileData = {};}

        //Store attributes
        fileData[key] = data;

        //Put it back in localStorage
        setFileData(filename,fileData);
    }

    function getAttributeForFile(filename,key) {
        var fileData;

        //See if the file has any current data stored
        fileData= getFileData(filename);

        //If no data stored, return an undefined value
        //(easier to check for than "false")
        if(!fileData) {return undefined;}

        //Otherwise, return the data asked for
        return fileData[key];
    }

    //Function to retrieve a file-data object from localStorage
    function getFileData(filename) {
        var fileData;
        //Prep the string for search
        filename = removeIdentifier(filename);
        filename = "file-data:"+filename;

        fileData = localStorage[filename];

        //Return the data if available
        if(fileData === undefined || fileData == false){
            return false;
        } else {
            try{
                return JSON.parse(fileData);
            } catch (err){
                return false;
            }
        }
    }

    //Function to store an data object for a specific file
    function setFileData(filename, dataObj) {
        //Prep the string for storage
        filename = removeIdentifier(filename);
        filename = "file-data:"+filename;

        //Store the file-data object
        dataObj = JSON.stringify(dataObj);
        localStorage.setItem(filename,dataObj);
    }

    //Function to delete file data, if needed
    function deleteFileData(filename) {
        //Prep the string for storage
        filename = removeIdentifier(filename);
        filename = "file-data:"+filename;

        //Delete the data
        delete localStorage[filename];
    }

    //Function to convert an aceFolds(or similar) object to a Range object
    function convertToRange(aceFold) {
        return (new Range(aceFold.startRow, aceFold.startColumn, aceFold.endRow, aceFold.endColumn));
    }


    //*************** Private Functions ****************
    //Takes whatever name is given and formats it appropriately
    //name: string of filename
    //type: file or directory
    function formatName(name, type) {

        if(type === "file") {
            if(name.indexOf("file:") !== 0) {
                name = "file:"+name;
            }
        }

        if(type === "directory") {
            if(name.indexOf("directory:") !== 0) {
                name = "directory:"+name;
            }
        }

        return name;
    }

    //Function to remove the identifier from a filename
    function removeIdentifier(name) {
        if (name.startsWith("file:")) {
            name = name.substring(5);
        }
        if (name.startsWith("directory:")) {
            name = name.substring(10);
        }
        return name;
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

    //A internal code folding class to keep track of folded code
    //in the IDE Ace editor. Ace has it's own internal classes for this,
    //but they cannot be stored in localStorage
    function aceFold() {
        this.startRow = 0;
        this.startColumn = 0;
        this.endRow = 0;
        this.endColumn = 0;
        //Function to check if a fold is identical to itself
        this.isSame = function (toCompare) {
            if(toCompare.startRow === this.startRow &&
                toCompare.startColumn === this.startColumn &&
                toCompare.endRow === this.endRow &&
                toCompare.endColumn === this.endColumn) {
                return true;
            } else {
                return false;
            }
        };
        //Function to load our fields from a aceFold Object
        this.loadFromSelf = function (aFold) {
            this.startRow = aFold.startRow;
            this.startColumn = aFold.startColumn;
            this.endRow = aFold.endRow;
            this.endColumn = aFold.endColumn;
            return this;
        };

        //Function to load our fields from a ace Range object
        this.loadFromRange = function (aRange) {
            this.startRow = aRange.start.row;
            this.startColumn = aRange.start.column;
            this.endRow = aRange.end.row;
            this.endColumn = aRange.end.column;
            return this;
        };

        //Function to convert self to a Range Object
        this.convertToRange = function () {
            return (new Range(this.startRow, this.startColumn, this.endRow, this.endColumn));
        };
    }


    return {
        "addFile": addFile,
        "deleteFile": deleteFile,
        "modifyFilePath":modifyFilePath,
        "checkFileInFolder":checkFileInFolder,
        "removeExtension":removeExtension,
        "addExtension":addExtension,
        "getExtension":getExtension,
        "validateExtension":validateExtension,
        "parseSlashName":parseSlashName,
        "packageFolder":packageFolder,
        "packageAllFiles":packageAllFiles,
        "downloadZip":downloadZip,
        "setDirectoryStatus":setDirectoryStatus,
        "getDirectoryStatus":getDirectoryStatus,
        "storeLastCursorPosition":storeLastCursorPosition,
        "getLastCursorPosition":getLastCursorPosition,
        "storeScrollBarPosition":storeScrollBarPosition,
        "getScrollBarPosition":getScrollBarPosition,
        "storeAllFolds":storeAllFolds,
        "getStoredFolds":getStoredFolds
    };
};



