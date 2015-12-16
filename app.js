var fs = require('fs'),
	electron = require('electron'),
	path = require('path');

var desktopCapturer = electron.desktopCapturer,
	remote = electron.remote,
	screen = electron.screen;

var Menu = remote.Menu,
	MenuItem = remote.MenuItem;

var alwaysOnTop = false,
	currentScreen = null,
	screenSize = {
		width: 640,
		height: 480
	};

function toggleAlwaysOnTop() {
	alwaysOnTop = !alwaysOnTop;
	remote.getCurrentWindow().setAlwaysOnTop(alwaysOnTop);

	if (alwaysOnTop) {
		document.getElementById('always-on-top').classList.add('active');
	} else {
		document.getElementById('always-on-top').classList.remove('active');
	}
}

var resizeMenu = new Menu(),
	doResize = function(item){
		var node = document.getElementById('resize-screen'),
			size = item.label.split(' x ');

		node.innerHTML = '<span class="icon icon-text icon-resize-full"></span>' + item.label;
		screenSize.width = parseInt(size[0], 10);
		screenSize.height = parseInt(size[1], 10);

		if (currentScreen) {
			var click = document.createEvent('MouseEvents');
			click.initEvent('click', false, true);
			currentScreen.dispatchEvent(click);
		}
	};
resizeMenu.append(new MenuItem({
	label: '640 x 480',
	type: 'radio',
	checked: true,
	click: doResize
}));
resizeMenu.append(new MenuItem({
	label: '800 x 600',
	type: 'radio',
	click: doResize
}));
resizeMenu.append(new MenuItem({
	label: '1280 x 800',
	type: 'radio',
	click: doResize
}));
resizeMenu.append(new MenuItem({
	label: '1440 x 900',
	type: 'radio',
	click: doResize
}));
resizeMenu.append(new MenuItem({
	label: '1680 x 1050',
	type: 'radio',
	click: doResize
}));

function resizeScreen(e) {
	resizeMenu.popup(remote.getCurrentWindow());
}

function fetchScreens() {
	var display = screen.getPrimaryDisplay(),
		title = document.getElementById('title'),
		screens = document.getElementById('screens'),
		video = document.getElementById('video'),
		toast = document.getElementById('toast'),
		capture = document.getElementById('capture');

	title.textContent = 'Rec';

	while (screens.firstChild) {
		screens.removeChild(screens.firstChild);
	}

	video.src = '';

	if (toast) {
		toast.parentNode.removeChild(toast);
	}

	if (capture) {
		capture.parentNode.removeChild(capture);
	}

	desktopCapturer.getSources({
		types: [
			'window',
			'screen'
		]
	}, function(error, sources){
		if (error) {
			return;
		}

		for (var i = 0; i < sources.length; ++i) {
			var li = document.createElement('li'),
				img = document.createElement('img'),
				div = document.createElement('div'),
				strong = document.createElement('strong'),
				p = document.createElement('p');

			li.id = sources[i].id;
			li.name = sources[i].name;
			li.className = 'list-group-item';
			li.onclick = selectScreen;
			img.className = 'img-rounded media-object pull-left';
			img.src = sources[i].thumbnail.toDataURL();
			img.width = 32;
			img.height = 32;
			div.className = 'media-body';
			strong.textContent = sources[i].name;
			p.textContent = sources[i].id;

			li.appendChild(img);
			li.appendChild(div);
			div.appendChild(strong);
			div.appendChild(p);

			screens.appendChild(li);
		}
	});
}

var selectScreen = function(){
	if (currentScreen) {
		currentScreen.classList.remove('active');
	}

	currentScreen = this;
	currentScreen.classList.add('active');

	var toast = document.getElementById('toast');
	if (toast) {
		toast.parentNode.removeChild(toast);
	}

	var capture = document.getElementById('capture');
	if (capture) {
		capture.parentNode.removeChild(capture);
	}

	var title = document.getElementById('title');
	title.textContent = currentScreen.name + ' - Rec';

	navigator.webkitGetUserMedia({
		audio: false,
		video: {
			mandatory: {
				chromeMediaSource: 'desktop',
				chromeMediaSourceId: currentScreen.id,
				minWidth: screenSize.width,
				maxWidth: screenSize.width,
				minHeight: screenSize.height,
				maxHeight: screenSize.height
			}
		}
	}, function(stream){
		var animation,
			startTime,
			frames = [],
			isRecord = false;

		var video = document.getElementById('video');
		video.src = window.URL.createObjectURL(stream);
		video.play();

		var canvas = document.createElement('canvas');
		canvas.width = screenSize.width;
		canvas.height = screenSize.height;

		var toast = document.createElement('p');
		toast.id = 'toast';
		toast.className = 'toast';
		toast.textContent = '00:00:00';

		var capture = document.createElement('span');
		capture.id = 'capture';
		capture.className = 'icon icon-camera capture';
		capture.onclick = function(){
			if (isRecord) {
				capture.className = 'icon icon-camera capture';

				cancelAnimationFrame(animation);

				var webm = Whammy.fromImageArray(frames, 1000 / 60),
					a = document.createElement('a'),
					click = document.createEvent('MouseEvents');

				a.href = window.URL.createObjectURL(webm);
				a.download = Date.now() + '.webm';
				click.initEvent('click', false, true);
				a.dispatchEvent(click);
			} else {
				capture.className = 'icon icon-stop capture';

				startTime = Date.now();
				frames = [];

				var context = canvas.getContext('2d'),
					draw = function(){
						context.drawImage(video, 0, 0);
						frames.push(canvas.toDataURL('image/webp', 1));

						var diff = Date.now() - startTime,
							hours = String(Math.floor(diff / 3600000) + 100).substring(1),
							minutes = String(Math.floor((diff - hours * 3600000) / 60000) + 100).substring(1),
							seconds = String(Math.round((diff - hours * 3600000 - minutes * 60000) / 1000) + 100).substring(1);
						toast.textContent = hours + ':' + minutes + ':' + seconds;

						animation = requestAnimationFrame(draw);
					};

				animation = requestAnimationFrame(draw);
			}

			isRecord = !isRecord;
		};

		video.parentNode.appendChild(toast);
		video.parentNode.appendChild(capture);
	}, function(e){});
};