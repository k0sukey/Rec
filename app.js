var fs = require('fs'),
	electron = require('electron'),
	path = require('path');

var desktopCapturer = electron.desktopCapturer,
	remote = electron.remote,
	screen = electron.screen;

var app = remote.app;

var currentScreen = null;

function fetchScreens() {
	var display = screen.getPrimaryDisplay(),
		title = document.getElementById('title'),
		screens = document.getElementById('screens'),
		video = document.getElementById('video'),
		capture = document.getElementById('capture');

	title.textContent = 'Rec';

	while (screens.firstChild) {
		screens.removeChild(screens.firstChild);
	}

	video.src = '';

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
			img.className = 'img-circle media-object pull-left';
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


	var capture = document.getElementById('capture');
	if (capture) {
		capture.parentNode.removeChild(capture);
	}

	var title = document.getElementById('title');
	title.textContent = this.name + ' - Rec';

	navigator.webkitGetUserMedia({
		audio: false,
		video: {
			mandatory: {
				chromeMediaSource: 'desktop',
				chromeMediaSourceId: this.id,
				minWidth: 580,
				maxWidth: 580,
				minHeight: 545,
				maxHeight: 545
			}
		}
	}, function(stream){
		var animation,
			frames = [],
			isRecord = false;

		var video = document.getElementById('video');
		video.src = window.URL.createObjectURL(stream);
		video.play();

		var canvas = document.createElement('canvas');
		canvas.width = 580;
		canvas.height = 545;

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

				frames = [];

				var context = canvas.getContext('2d'),
					draw = function(){
						context.drawImage(video, 0, 0);
						frames.push(canvas.toDataURL('image/webp', 1));

						animation = requestAnimationFrame(draw);
					};

				animation = requestAnimationFrame(draw);
			}

			isRecord = !isRecord;
		};

		video.parentNode.appendChild(capture);
	}, function(e){});
};