const fs = require('fs')
const path = require('path')

const fileExists = (filename) => fs.existsSync(path.join(process.cwd(), filename));

const renameFile = async (source, destination) => {
    await fs.renameSync(path.join(process.cwd(), source), path.join(process.cwd(), destination), error => {
        if (error) {
            console.log('ERROR: ' + error);
        }
    });
}

const moveFile = (source, destination) => {
    renameFile(source, destination);
}

module.exports = { moveFile, fileExists }
