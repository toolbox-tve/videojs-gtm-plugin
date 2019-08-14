# videojs-tbx-gtm

Reporting of player events to Google Tag Manager API

## Installation

```sh
npm install --save videojs-tbx-gtm
```

## Usage

To include videojs-tbx-gtm on your website or web application, use any of the following methods.

### `<script>` Tag

This is the simplest case. Get the script in whatever way you prefer and include the plugin _after_ you include [video.js][videojs], so that the `videojs` global is available.

```html
<script src="//path/to/video.min.js"></script>
<script src="//path/to/videojs-tbx-gtm.min.js"></script>
<script>
  var player = videojs('my-video');

  player.tbxGtm();
</script>
```

### Browserify/CommonJS

When using with Browserify, install videojs-tbx-gtm via npm and `require` the plugin as you would any other module.

```js
var videojs = require('video.js');

// The actual plugin function is exported by this module, but it is also
// attached to the `Player.prototype`; so, there is no need to assign it
// to a variable.
require('videojs-tbx-gtm');

var player = videojs('my-video');

player.tbxGtm();
```

### RequireJS/AMD

When using with RequireJS (or another AMD library), get the script in whatever way you prefer and `require` the plugin as you normally would:

```js
require(['video.js', 'videojs-tbx-gtm'], function(videojs) {
  var player = videojs('my-video');

  player.tbxGtm();
});
```

## License

UNLICENSED. Copyright (c) Dario Seminara &lt;dseminara@tbxnet.com&gt;


[videojs]: http://videojs.com/
