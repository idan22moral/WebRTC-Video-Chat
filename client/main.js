const {app, Dock, BrowserWindow, CommandLine} = require('electron');
const io = require('socket.io-client');

app.whenReady().then(() => {
    let win = new BrowserWindow({ width: 1920, height: 1080, show: false });
    win.loadFile('public/index.html')
    win.once('ready-to-show', () => {
        win.show();
    });
});