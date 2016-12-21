"use strict";

// Framework for "file.js" to utilize to make it easier to work with LocalStorage
// and make the code more readable. This is intended as a complete API for the file system,
// and can be expanded to the files as needed.
// Functionality includes:
//  - Add folders/files
//  - Remove folders/files
//  - Check if folder/file exists
var JSZip = require("jszip");
var fileSaver = require("filesaver.js");

exports.setup = function () {

    ///****************** Local Storage Functions ****************************
    //Function to add a file
    function addFile(filename) {

    }

    //Function to delete file from localStorage
    //Expects full file-url from file-tree
    function deleteFile(filename)
    {

    }

    //Return a list of all files in folder
    function getFilesInFolder(foldername) {

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
        if(extPosition !== -1)
        {
            return filename.substring(0,extPosition);
        }
    }

    //Function to add a .grace extension to string
    function addExtension(filename) {

        //Check if there already is a ".grace" extension
        if(!(filename.endsWith(".grace"))){
            filename = filename + ".grace";
        }

        //If extension already exists, we just return string without any changes
        return filename;
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

    return {
        "addFile": addFile,
        "deleteFile": deleteFile,
        "checkFileInFolder":checkFileInFolder,
        "removeExtension":removeExtension,
        "addExtension":addExtension,
        "parseSlashName":parseSlashName,
        "packageFolder":packageFolder,
        "packageAllFiles":packageAllFiles,
        "downloadZip":downloadZip,
        "setDirectoryStatus":setDirectoryStatus,
        "getDirectoryStatus":getDirectoryStatus
    };
};



