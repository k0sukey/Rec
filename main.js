"use strict";
var path = require("path");
var url = require("url");
var electron_1 = require("electron");
var Application = (function () {
    function Application() {
        var _this = this;
        electron_1.app.on('ready', this.createWindow);
        electron_1.app.on('activate', function () {
            if (_this.window === null) {
                _this.createWindow();
            }
        });
        electron_1.app.on('window-all-closed', function () {
            if (process.platform !== 'darwin') {
                electron_1.app.quit();
            }
        });
        electron_1.ipcMain.on('toggleSize', function (event, captureSize) {
            event.sender.send('toggleSize', captureSize);
        });
        electron_1.ipcMain.on('toggleFormat', function (event, format) {
            event.sender.send('toggleFormat', format);
        });
        electron_1.ipcMain.on('fetchScreen', function (event) {
            event.sender.send('fetchScreen');
        });
        electron_1.ipcMain.on('captureScreen', function (event, screenId) {
            event.sender.send('captureScreen', screenId);
        });
    }
    Application.prototype.createWindow = function () {
        var _this = this;
        this.window = new electron_1.BrowserWindow({
            width: 800,
            height: 600,
            resizable: false,
            acceptFirstMouse: false,
            titleBarStyle: 'hidden'
        });
        this.window.loadURL(url.format({
            pathname: path.join(__dirname, 'index.html'),
            protocol: 'file:',
            slashes: true
        }));
        this.window.on('closed', function () {
            _this.window = null;
        });
    };
    return Application;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Application;
new Application();
