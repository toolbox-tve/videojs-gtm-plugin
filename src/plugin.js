import videojs from 'video.js';
import {version as VERSION} from '../package.json';

// Default options for the plugin.
const defaults = {};

// Cross-compatibility for Video.js 5 and 6.
const registerPlugin = videojs.registerPlugin || videojs.plugin;
// const dom = videojs.dom || videojs;

/**
 * Function to invoke when the player is ready.
 *
 * This is a great place for your plugin to initialize itself. When this
 * function is called, the player will have its DOM and child components
 * in place.
 *
 * @function onPlayerReady
 * @param    {Player} player
 *           A Video.js player object.
 *
 * @param    {Object} [options={}]
 *           A plain object containing options for the plugin.
 */
const onPlayerReady = (player, options) => {
  const gtmDataLayer = options.gtmDataLayer;
  const contentLabel = options.contentLabel;
  const additionalData = options.additionalData;
  let pendingPercentiles = (options.percentiles || []).slice(0);
  let lastTime = 0;

  function onPlayerPlay(e) {
    gtmDataLayer.push({
      event: 'play',
      label: contentLabel,
      additionalData: additionalData
    });
  }

  function onPlayerPause(e) {
    gtmDataLayer.push({
      event: 'pause',
      label: contentLabel,
      additionalData: additionalData
    });
  }

  function onTimeUpdate(e) {
    if (lastTime > player.currentTime()) {
      const fraction = player.currentTime() / player.duration();

      // reset persentiles
      pendingPercentiles = percentiles.filter(p => p >= fraction);
    }

    if (pendingPercentiles.length) {
      const fraction = player.currentTime() / player.duration();
      const percentil = pendingPercentiles[0];

      if (fraction >= percentil) {
        gtmDataLayer.push({
          event: 'consumo-porcentual',
          label: (percentil * 100) + '%',
          additionalData: additionalData
        });

        pendingPercentiles.shift();
      }
    }

    lastTime = player.currentTime();
  }

  player.on('play', onPlayerPlay);
  player.on('pause', onPlayerPause);
  player.on('timeupdate', onTimeUpdate);
  player.addClass('vjs-tbx-gtm');
};

/**
 * A video.js plugin.
 *
 * In the plugin function, the value of `this` is a video.js `Player`
 * instance. You cannot rely on the player being in a "ready" state here,
 * depending on how the plugin is invoked. This may or may not be important
 * to you; if not, remove the wait for "ready"!
 *
 * @function tbxGtm
 * @param    {Object} [options={}]
 *           An object of options left to the plugin author to define.
 */
const tbxGtm = function(options) {
  this.ready(() => {
    onPlayerReady(this, videojs.mergeOptions(defaults, options));
  });
};

// Register the plugin with video.js.
registerPlugin('tbxGtm', tbxGtm);

// Include the version number.
tbxGtm.VERSION = VERSION;

export default tbxGtm;
