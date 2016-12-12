"use strict";

// Framework for "file.js" to utilize to make it easier to work with LocalStorage
// and make the code more readable. This is intended as a complete API for the file system,
// and can be expanded to the files as needed.
// Functionality includes:
//  - Add folders/files
//  - Remove folders/files
//  - Check if folder/file exists

exports.setup = function () {

    //Function to add a file
    function addFile(filename) {

    }

    //Function to delete file from localStorage
    //Expects full file-url from file-tree
    function deleteFile(filename)
    {

    }

    //******* String functions *********

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

    return {
        "addFile": addFile,
        "deleteFile": deleteFile,
        "removeExtension":removeExtension
    };
};



