import * as path from 'path';
import * as url from 'url';
import {app, BrowserWindow, ipcMain} from 'electron';

import {CaptureSize, FormatType} from './renderer';

export default class Application {
  private window: Electron.BrowserWindow;

  constructor() {
    app.on('ready', this.createWindow);

    app.on('activate', () => {
      if (this.window === null) {
        this.createWindow();
      }
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    ipcMain.on('toggleSize', (event: Electron.IpcMainEvent, captureSize: CaptureSize) => {
      event.sender.send('toggleSize', captureSize);
    });

    ipcMain.on('toggleFormat', (event: Electron.IpcMainEvent, format: FormatType) => {
      event.sender.send('toggleFormat', format);
    });

    ipcMain.on('fetchScreen', (event: Electron.IpcMainEvent) => {
      event.sender.send('fetchScreen');
    });

    ipcMain.on('captureScreen', (event: Electron.IpcMainEvent, screenId: string) => {
      event.sender.send('captureScreen', screenId);
    });
  }

  private createWindow() {
    this.window = new BrowserWindow({
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

    this.window.on('closed', () => {
      this.window = null;
    });
  }
}

new Application();
