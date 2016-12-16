"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var electron = require("electron");
var React = require("react");
var ReactDOM = require("react-dom");
var Toolbar = (function (_super) {
    __extends(Toolbar, _super);
    function Toolbar() {
        var _this = _super.call(this) || this;
        _this.state = {
            alwaysOnTop: false,
            size: '640 x 480',
            format: 'webm'
        };
        _this.ipc = electron.ipcRenderer;
        _this.window = electron.remote.getCurrentWindow();
        _this.menu = new electron.remote.Menu();
        ['640 x 480', '800 x 600', '1280 x 800', '1440 x 900', '1680 x 1050'].map(function (label) {
            _this.menu.append(new electron.remote.MenuItem({
                label: label,
                type: 'radio',
                checked: label === '640 x 480',
                click: _this.toggleSize.bind(_this)
            }));
        });
        return _this;
    }
    Toolbar.prototype.render = function () {
        var _this = this;
        return (React.createElement("div", { className: "toolbar-actions" },
            React.createElement("div", { className: "btn-group" },
                React.createElement("button", { className: ['btn', 'btn-default', this.state.alwaysOnTop && 'active'].join(' '), style: { borderRadius: 4 }, onClick: this.toggleAlwaysOnTop.bind(this) },
                    React.createElement("span", { className: "icon icon-popup" }))),
            React.createElement("button", { className: "btn btn-default btn-dropdown", onClick: function () { _this.menu.popup(_this.window); } },
                React.createElement("span", { className: "icon icon-text icon-resize-full" }),
                this.state.size),
            React.createElement("div", { className: "btn-group" },
                React.createElement("button", { className: ['btn', 'btn-default', this.state.format === 'webm' && 'active'].join(' '), onClick: this.toggleFormat.bind(this) }, "webm"),
                React.createElement("button", { className: ['btn', 'btn-default', this.state.format === 'gif' && 'active'].join(' '), onClick: this.toggleFormat.bind(this) }, "gif")),
            React.createElement("button", { className: "btn btn-default pull-right", onClick: this.fetchScreen.bind(this) },
                React.createElement("span", { className: "icon icon-arrows-ccw" }))));
    };
    Toolbar.prototype.toggleAlwaysOnTop = function () {
        var alwaysOnTop = !this.state.alwaysOnTop;
        this.window.setAlwaysOnTop(alwaysOnTop);
        this.setState({
            alwaysOnTop: alwaysOnTop,
            size: this.state.size,
            format: this.state.format
        });
    };
    Toolbar.prototype.toggleSize = function (item) {
        this.setState({
            alwaysOnTop: this.state.alwaysOnTop,
            size: item.label,
            format: this.state.format
        });
        var captureSize = item.label.split(' x ');
        this.ipc.send('toggleSize', {
            width: parseInt(captureSize[0], 10),
            height: parseInt(captureSize[1], 10),
        });
    };
    Toolbar.prototype.toggleFormat = function () {
        var format = (this.state.format === 'webm' ? 'gif' : 'webm');
        this.setState({
            alwaysOnTop: this.state.alwaysOnTop,
            size: this.state.size,
            format: format
        });
        this.ipc.send('toggleFormat', format);
    };
    Toolbar.prototype.fetchScreen = function () {
        this.ipc.send('fetchScreen');
    };
    return Toolbar;
}(React.Component));
var Screen = (function (_super) {
    __extends(Screen, _super);
    function Screen() {
        var _this = _super.call(this) || this;
        _this.state = {
            captureSources: []
        };
        _this.ipc = electron.ipcRenderer;
        _this.desktopCapturer = electron.desktopCapturer;
        return _this;
    }
    Screen.prototype.componentDidMount = function () {
        var _this = this;
        this.fetchScreen();
        this.ipc.on('fetchScreen', function () {
            _this.fetchScreen();
        });
    };
    Screen.prototype.render = function () {
        var _this = this;
        return (React.createElement("ul", { className: "list-group" }, this.state.captureSources.map(function (source) {
            return (React.createElement("li", { key: source.id, id: source.id, className: 'list-group-item', onClick: _this.selectScreen.bind(_this) },
                React.createElement("img", { src: source.thumbnail.toDataURL(), className: 'img-rounded media-object pull-left', style: { width: 32, height: 32 } }),
                React.createElement("div", { className: 'media-body' },
                    React.createElement("strong", null, source.name),
                    React.createElement("p", null, source.id))));
        })));
    };
    Screen.prototype.fetchScreen = function () {
        var _this = this;
        this.desktopCapturer.getSources({
            types: ['window', 'screen']
        }, function (error, sources) {
            if (error) {
                return;
            }
            _this.setState({
                captureSources: sources
            });
        });
    };
    Screen.prototype.selectScreen = function (event) {
        if (this.prevTarget) {
            this.prevTarget.classList.remove('active');
        }
        var target = event.currentTarget;
        target.classList.add('active');
        this.ipc.send('captureScreen', target.id);
        this.prevTarget = target;
    };
    return Screen;
}(React.Component));
var Video = (function (_super) {
    __extends(Video, _super);
    function Video() {
        var _this = _super.call(this) || this;
        _this.state = {
            isRecord: false,
            timer: '00:00:00'
        };
        _this.canvas = document.createElement('canvas');
        _this.canvas.setAttribute('width', '640px');
        _this.canvas.setAttribute('height', '480px');
        _this.canvasctx = _this.canvas.getContext('2d');
        _this.downloader = document.createElement('a');
        _this.captureSize = {
            width: 640,
            height: 480
        };
        _this.format = 'webm';
        _this.ipc = electron.ipcRenderer;
        _this.ipc.on('toggleSize', function (event, captureSize) {
            _this.captureSize = captureSize;
            _this.canvas.setAttribute('width', _this.captureSize.width + "px");
            _this.canvas.setAttribute('height', _this.captureSize.height + "px");
            if (_this.screenId) {
                _this.captureScreen();
            }
        });
        _this.ipc.on('toggleFormat', function (event, format) {
            _this.format = format;
        });
        _this.ipc.on('captureScreen', function (event, screenId) {
            _this.screenId = screenId;
            _this.captureScreen();
        });
        return _this;
    }
    Video.prototype.componentDidMount = function () {
        this.player = ReactDOM.findDOMNode(this.refs['player']);
        this.toast = ReactDOM.findDOMNode(this.refs['toast']);
        this.capture = ReactDOM.findDOMNode(this.refs['capture']);
    };
    Video.prototype.render = function () {
        return (React.createElement("div", null,
            React.createElement("video", { ref: "player", style: { width: 580, height: 545 } }),
            React.createElement("p", { ref: "toast", className: "toast" }, this.state.timer),
            React.createElement("span", { ref: "capture", className: "icon icon-record capture", onClick: this.capturing.bind(this) })));
    };
    Video.prototype.captureScreen = function () {
        var nav = navigator;
        nav.webkitGetUserMedia({
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: this.screenId,
                    minWidth: this.captureSize.width,
                    maxWidth: this.captureSize.width,
                    minHeight: this.captureSize.height,
                    maxHeight: this.captureSize.height
                }
            }
        }, this.streamScreen.bind(this), function (e) { console.log(e); });
    };
    Video.prototype.streamScreen = function (stream) {
        var playerURL = this.player.getAttribute('src');
        if (playerURL) {
            window.URL.revokeObjectURL(playerURL);
        }
        this.player.setAttribute('src', window.URL.createObjectURL(stream));
        this.player.play();
    };
    Video.prototype.capturing = function () {
        if (!this.player.getAttribute('src')) {
            return;
        }
        if (this.state.isRecord) {
            this.capture.className = 'icon icon-record capture';
            cancelAnimationFrame(this.requestId);
            var downloaderURL = this.downloader.getAttribute('href');
            if (downloaderURL) {
                window.URL.revokeObjectURL(downloaderURL);
            }
            if (this.format === 'webm') {
                this.toWebm();
            }
            else if (this.format === 'gif') {
                this.toGif();
            }
            this.setState({
                isRecord: false,
                timer: '00:00:00'
            });
            return;
        }
        this.capture.className = 'icon icon-stop capture';
        this.frames = [];
        this.startTime = Date.now();
        this.setState({
            isRecord: true,
            timer: '00:00:00'
        });
        this.requestId = requestAnimationFrame(this.draw.bind(this));
    };
    Video.prototype.draw = function () {
        this.canvasctx.drawImage(this.player, 0, 0);
        this.frames.push(this.canvas.toDataURL('image/webp', 0.8));
        var diff = Date.now() - this.startTime;
        var hours = String(Math.floor(diff / 3600000) + 100).substring(1);
        var minutes = String(Math.floor((diff - parseInt(hours, 10) * 3600000) / 60000) + 100).substring(1);
        var seconds = String(Math.round((diff - parseInt(hours, 10) * 3600000 - parseInt(minutes, 10) * 60000) / 1000) + 100).substring(1);
        this.setState({
            isRecord: this.state.isRecord,
            timer: hours + ":" + minutes + ":" + seconds
        });
        this.requestId = requestAnimationFrame(this.draw.bind(this));
    };
    Video.prototype.toWebm = function () {
        var webm = window['Whammy'].fromImageArray(this.frames, 1000 / 60);
        this.finalize(webm, 'webm');
    };
    Video.prototype.toGif = function () {
        var _this = this;
        window['gifshot'].createGIF({
            images: this.frames,
            gifWidth: this.captureSize.width,
            gifHeight: this.captureSize.height
        }, function (response) {
            if (response.error) {
                return;
            }
            var bin = atob(response.image.slice(22));
            var buffer = new Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) {
                buffer[i] = bin.charCodeAt(i);
            }
            var gif = new Blob([buffer]);
            _this.finalize(gif, 'gif');
        });
    };
    Video.prototype.finalize = function (blob, format) {
        var clicker = document.createEvent('MouseEvent');
        clicker.initEvent('click', false, true);
        this.downloader.setAttribute('href', window.URL.createObjectURL(blob));
        this.downloader.setAttribute('download', this.startTime + "." + format);
        this.downloader.dispatchEvent(clicker);
    };
    return Video;
}(React.Component));
var Renderer = (function () {
    function Renderer() {
        this.toolbar = React.createElement(Toolbar);
        ReactDOM.render(this.toolbar, document.querySelector('#toolbar'));
        this.screen = React.createElement(Screen);
        ReactDOM.render(this.screen, document.querySelector('#screen'));
        this.video = React.createElement(Video);
        ReactDOM.render(this.video, document.querySelector('#video'));
    }
    return Renderer;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Renderer;
new Renderer();
