var electron = require('electron'),
	path = require('path');

var app = electron.app,
	BrowserWindow = electron.BrowserWindow;

var window = null;

app.on('window-all-closed', function(){
	app.quit();
});

app.on('ready', function(){
	window = new BrowserWindow({
		width: 800,
		height: 600,
		resizable: false,
		'accept-first-mouse': true,
		'title-bar-style': 'hidden'
	});
	window.loadURL('file://' + path.join(__dirname, 'app.html'));

	window.on('closed', function(){
		window = null;
	});
});