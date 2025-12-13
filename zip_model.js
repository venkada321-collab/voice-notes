
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Install archiver locally if needed or rely on what's available?
// Better to just try npm install archiver first or assume available?
// Actually, I can just install archiver in the project dev dependencies.

const output = fs.createWriteStream(path.join(__dirname, 'assets/models/vosk-model.zip'));
const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
});

output.on('close', function () {
    console.log(archive.pointer() + ' total bytes');
    console.log('archiver has been finalized and the output file descriptor has closed.');
});

archive.on('warning', function (err) {
    if (err.code === 'ENOENT') {
        // log warning
    } else {
        // throw error
        throw err;
    }
});

archive.on('error', function (err) {
    throw err;
});

archive.pipe(output);

// append files from a sub-directory, putting its contents at the root of archive
archive.directory('assets/models/model/', false);

archive.finalize();
