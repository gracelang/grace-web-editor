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
    function packageFolder(name)
    {
        name = removeIdentifier(name);
        var zip = new JSZip();
        var localFolder = zip.folder(name);
        var identifier;

        for (identifier in localStorage) {
            if (identifier.startsWith("file:") &&
                identifier.includes(name)) {
                localFolder.file(identifier.substring(5), localStorage[identifier]);
            }
            if (identifier.startsWith("directory:") &&
                identifier.includes(name)) {
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


    //*************** Private Functions ****************

    //Takes whatever name is given and formats it appropriately
    //name: string of filename
    //type: file or directory
    function formatName(name, type) {

        if(type == "file") {
            if(name.indexOf("file:") === 0) {
                name = "file:"+name;
            }
        }

        if(type == "directory") {
            if(name.indexOf("directory:") === 0) {
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


    return {
        "addFile": addFile,
        "deleteFile": deleteFile,
        "removeExtension":removeExtension,
        "packageFolder":packageFolder,
        "packageAllFiles":packageAllFiles,
        "downloadZip":downloadZip
    };
};



