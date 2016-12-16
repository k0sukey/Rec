import * as electron from 'electron';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

type SizeType = '640 x 480' | '800 x 600' | '1280 x 800' | '1440 x 900' | '1680 x 1050';
export type FormatType = 'webm' | 'gif';

export interface CaptureSize {
  width: number;
  height: number;
}

interface ToolbarState {
  alwaysOnTop: boolean;
  size: SizeType;
  format: FormatType;
}

interface ScreenState {
  captureSources: Electron.DesktopCapturerSource[];
}

interface VideoState {
  isRecord: boolean;
  timer: string;
}

class Toolbar extends React.Component<any, ToolbarState> {
  private ipc: Electron.IpcRenderer;
  private window: Electron.BrowserWindow;
  private menu: Electron.Menu;

  constructor() {
    super();

    this.state = {
      alwaysOnTop: false,
      size: '640 x 480',
      format: 'webm'
    };

    this.ipc = electron.ipcRenderer;
    this.window = electron.remote.getCurrentWindow();
    this.menu = new electron.remote.Menu();

    ['640 x 480', '800 x 600', '1280 x 800', '1440 x 900', '1680 x 1050'].map((label: string) => {
      this.menu.append(new electron.remote.MenuItem({
        label: label,
        type: 'radio',
        checked: label === '640 x 480',
        click: this.toggleSize.bind(this)
      }));
    });
  }

  render(): JSX.Element {
    return (
      <div
        className="toolbar-actions"
      >
        <div
          className="btn-group">
          <button
            className={['btn', 'btn-default', this.state.alwaysOnTop && 'active'].join(' ')}
            style={{borderRadius: 4}}
            onClick={this.toggleAlwaysOnTop.bind(this)}
          >
            <span
              className="icon icon-popup"/>
          </button>
        </div>
        <button
          className="btn btn-default btn-dropdown"
          onClick={() => { this.menu.popup(this.window); }}>
          <span
            className="icon icon-text icon-resize-full"/>
          {this.state.size}
        </button>
        <div
          className="btn-group">
          <button
            className={['btn', 'btn-default', this.state.format === 'webm' && 'active'].join(' ')}
            onClick={this.toggleFormat.bind(this)}>webm</button>
          <button
            className={['btn', 'btn-default', this.state.format === 'gif' && 'active'].join(' ')}
            onClick={this.toggleFormat.bind(this)}>gif</button>
        </div>
        <button
          className="btn btn-default pull-right"
          onClick={this.fetchScreen.bind(this)}
        >
          <span
            className="icon icon-arrows-ccw"/>
        </button>
      </div>
    );
  }

  private toggleAlwaysOnTop(): void {
    let alwaysOnTop = !this.state.alwaysOnTop;
    this.window.setAlwaysOnTop(alwaysOnTop);
    this.setState({
      alwaysOnTop: alwaysOnTop,
      size: this.state.size,
      format: this.state.format
    });
  }

  private toggleSize(item: Electron.MenuItem): void {
    this.setState({
      alwaysOnTop: this.state.alwaysOnTop,
      size: item.label as SizeType,
      format: this.state.format
    });
    let captureSize = item.label.split(' x ');
    this.ipc.send('toggleSize', {
      width: parseInt(captureSize[0], 10),
      height: parseInt(captureSize[1], 10),
    } as CaptureSize);
  }

  private toggleFormat(): void {
    let format = (this.state.format === 'webm' ? 'gif' : 'webm') as FormatType;
    this.setState({
      alwaysOnTop: this.state.alwaysOnTop,
      size: this.state.size,
      format: format
    });
    this.ipc.send('toggleFormat', format);
  }

  private fetchScreen(): void {
    this.ipc.send('fetchScreen');
  }
}

class Screen extends React.Component<any, ScreenState> {
  private ipc: Electron.IpcRenderer;
  private desktopCapturer: Electron.DesktopCapturer;
  private prevTarget: HTMLElement;

  constructor() {
    super();

    this.state = {
      captureSources: []
    };

    this.ipc = electron.ipcRenderer;
    this.desktopCapturer = electron.desktopCapturer;
  }

  componentDidMount(): void {
    this.fetchScreen();

    this.ipc.on('fetchScreen', () => {
      this.fetchScreen();
    });
  }

  render(): JSX.Element {
    return (
      <ul
        className="list-group"
      >{this.state.captureSources.map((source: Electron.DesktopCapturerSource) => {
        return (
          <li
            key={source.id}
            id={source.id}
            className='list-group-item'
            onClick={this.selectScreen.bind(this)}
            >
            <img
              src={source.thumbnail.toDataURL()}
              className='img-rounded media-object pull-left'
              style={{width: 32, height: 32}}/>
            <div
              className='media-body'
            >
              <strong>{source.name}</strong>
              <p>{source.id}</p>
            </div>
          </li>
        );
      })}</ul>
    );
  }

  private fetchScreen(): void {
    this.desktopCapturer.getSources({
      types: ['window', 'screen']
    }, (error, sources) => {
      if (error) {
        return;
      }

      this.setState({
        captureSources: sources
      });
    });
  }

  private selectScreen(event: React.MouseEvent<any>): void {
    if (this.prevTarget) {
      this.prevTarget.classList.remove('active');
    }

    let target: HTMLElement = event.currentTarget;
    target.classList.add('active');

    this.ipc.send('captureScreen', target.id);

    this.prevTarget = target;
  }
}

class Video extends React.Component<any, VideoState> {
  private ipc: Electron.IpcRenderer;
  private player: HTMLVideoElement;
  private toast: HTMLParagraphElement;
  private capture: HTMLSpanElement;
  private canvas: HTMLCanvasElement;
  private canvasctx: CanvasRenderingContext2D;
  private downloader: HTMLAnchorElement;
  private frames: string[];
  private startTime: number;
  private requestId: number;
  private screenId: string;
  private captureSize: CaptureSize;
  private format: FormatType;

  constructor() {
    super();

    this.state = {
      isRecord: false,
      timer: '00:00:00'
    };

    this.canvas = document.createElement('canvas') as HTMLCanvasElement;
    this.canvas.setAttribute('width', '640px');
    this.canvas.setAttribute('height', '480px');
    this.canvasctx = this.canvas.getContext('2d');
    this.downloader = document.createElement('a') as HTMLAnchorElement;
    this.captureSize = {
      width: 640,
      height: 480
    } as CaptureSize;
    this.format = 'webm' as FormatType;

    this.ipc = electron.ipcRenderer;

    this.ipc.on('toggleSize', (event: Electron.IpcRendererEvent, captureSize: CaptureSize) => {
      this.captureSize = captureSize;

      this.canvas.setAttribute('width', `${this.captureSize.width}px`);
      this.canvas.setAttribute('height', `${this.captureSize.height}px`);

      if (this.screenId) {
        this.captureScreen();
      }
    });

    this.ipc.on('toggleFormat', (event: Electron.IpcRendererEvent, format: FormatType) => {
      this.format = format;
    });

    this.ipc.on('captureScreen', (event: Electron.IpcRendererEvent, screenId: string) => {
      this.screenId = screenId;
      this.captureScreen();
    });
  }

  componentDidMount(): void {
    this.player = ReactDOM.findDOMNode(this.refs['player']) as HTMLVideoElement;
    this.toast = ReactDOM.findDOMNode(this.refs['toast']) as HTMLParagraphElement;
    this.capture = ReactDOM.findDOMNode(this.refs['capture']) as HTMLSpanElement;
  }

  render(): JSX.Element {
    return (
      <div>
        <video
          ref="player"
          style={{width: 580, height: 545}}/>
        <p
          ref="toast"
          className="toast"
        >{this.state.timer}</p>
        <span
          ref="capture"
          className="icon icon-record capture"
          onClick={this.capturing.bind(this)}/>
      </div>
    );
  }

  private captureScreen(): void {
    let nav = navigator as any;
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
    }, this.streamScreen.bind(this), (e) => { console.log(e); });
  }

  private streamScreen(stream: MediaStream): void {
    let playerURL = this.player.getAttribute('src');
    if (playerURL) {
      window.URL.revokeObjectURL(playerURL);
    }

    this.player.setAttribute('src', window.URL.createObjectURL(stream));
    this.player.play();
  }

  private capturing(): void {
    if (!this.player.getAttribute('src')) {
      return;
    }

    if (this.state.isRecord) {
      this.capture.className = 'icon icon-record capture';

      cancelAnimationFrame(this.requestId);

      let downloaderURL = this.downloader.getAttribute('href');
      if (downloaderURL) {
        window.URL.revokeObjectURL(downloaderURL);
      }

      if (this.format === 'webm') {
        this.toWebm();
      } else if (this.format === 'gif') {
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
  }

  private draw(): void {
    this.canvasctx.drawImage(this.player, 0, 0);
    this.frames.push(this.canvas.toDataURL('image/webp', 0.8));

    let diff = Date.now() - this.startTime;
    let hours = String(Math.floor(diff / 3600000) + 100).substring(1);
    let minutes = String(Math.floor((diff - parseInt(hours, 10) * 3600000) / 60000) + 100).substring(1);
    let seconds = String(Math.round((diff - parseInt(hours, 10) * 3600000 - parseInt(minutes, 10) * 60000) / 1000) + 100).substring(1);

    this.setState({
      isRecord: this.state.isRecord,
      timer: `${hours}:${minutes}:${seconds}`
    });

    this.requestId = requestAnimationFrame(this.draw.bind(this));
  }

  private toWebm(): void {
    let webm = window['Whammy'].fromImageArray(this.frames, 1000 / 60) as Blob;
    this.finalize(webm, 'webm' as FormatType);
  }

  private toGif(): void {
    window['gifshot'].createGIF({
      images: this.frames,
      gifWidth: this.captureSize.width,
      gifHeight: this.captureSize.height
    }, (response) => {
      if (response.error) {
        return;
      }

      let bin = atob(response.image.slice(22));
      let buffer = new Uint8Array(bin.length);

      for (let i = 0; i < bin.length; i++) {
        buffer[i] = bin.charCodeAt(i);
      }

      let gif = new Blob([buffer]);
      this.finalize(gif, 'gif' as FormatType);
    });
  }

  private finalize(blob: Blob, format: FormatType): void {
    let clicker = document.createEvent('MouseEvent') as MouseEvent;
    clicker.initEvent('click', false, true);
    this.downloader.setAttribute('href', window.URL.createObjectURL(blob));
    this.downloader.setAttribute('download', `${this.startTime}.${format}`);
    this.downloader.dispatchEvent(clicker);
  }
}

export default class Renderer {
  private toolbar: React.ReactElement<{}>;
  private screen: React.ReactElement<{}>;
  private video: React.ReactElement<{}>;

  constructor() {
    this.toolbar = React.createElement(Toolbar);
    ReactDOM.render(this.toolbar, document.querySelector('#toolbar'));

    this.screen = React.createElement(Screen);
    ReactDOM.render(this.screen, document.querySelector('#screen'));

    this.video = React.createElement(Video);
    ReactDOM.render(this.video, document.querySelector('#video'));
  }
}

new Renderer();
