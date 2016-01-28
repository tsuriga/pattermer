'use strict';

const electron = require('electron'),
    app = electron.app,
    BrowserWindow = electron.BrowserWindow;

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        'min-width': 800,
        'min-height': 400,
        'accept-first-mouse': true,
        'title-bar-style': 'hidden'
    });

    mainWindow.loadURL('file://' + __dirname + '/app.html');

    mainWindow.openDevTools();

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
