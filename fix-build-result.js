const glob = require("glob");
const concat = require('concat-files');
const fs = require('fs');

glob("projects/**/*.d.ts", (err, files) => {
    if (err) throw err;

    rebuildDefinitions(files);

});

function rebuildDefinitions(files) {
    // somehow running ng build results in a broken index.d.ts file, concat it manually
    concat(files, 'dist/pazznetwork/ngx-chat/index.d.ts', function(err) {
        if (err) throw err;

        console.log("rebuilt index.d.ts ...");
        appendReferenceToIndexDefinition();

    });
}

function appendReferenceToIndexDefinition() {
    // add a reference to the newly built index.d.ts
    const path = './dist/pazznetwork/ngx-chat/public_api.d.ts';
    const content = fs.readFileSync(path);
    fs.writeFileSync(path, '/// <reference path="index.d.ts" />\n' + content);
    console.log("appended reference, done with build post processing");
}
