const {app, Dock, BrowserWindow, CommandLine} = require('electron');

app.whenReady().then(() => {
    let win = new BrowserWindow({ width: 1920, height: 1080, show: false });
    win.loadFile('public/index.html')
    win.loadURL('https://video.hexionteam.com')
    win.once('ready-to-show', () => {
        win.show();
    });
});