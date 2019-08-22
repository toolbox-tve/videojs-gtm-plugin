import videojs from 'video.js';
import {version as VERSION} from '../package.json';

// Default options for the plugin.
const defaults = {};

// Cross-compatibility for Video.js 5 and 6.
const registerPlugin = videojs.registerPlugin || videojs.plugin;
// const dom = videojs.dom || videojs;

const createGtmDataLayer = (options) => {
  const dataLayerVarName = 'dataLayer' + Math.floor(Math.random() * 1000);

  if (options.gtmDataLayer) {
    return () => options.gtmDataLayer;
  }

  if (!options.gtmKey) {
    return noDataLayer;
  }

  /* global document */
  const firstScriptTag = document.getElementsByTagName('script')[0];
  const newScriptTag = document.createElement('script');
  const key = options.gtmKey;

  newScriptTag.async = true;
  newScriptTag.src = 'https://www.googletagmanager.com/gtm.js?id=' + key + '&l=' + dataLayerVarName;
  firstScriptTag.parentNode.insertBefore(newScriptTag, firstScriptTag);

  const noDataLayer = {
    push: () => {}
  };

  /* global window */
  return () => window[dataLayerVarName] || noDataLayer;
};
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
  const gtmDataLayer = createGtmDataLayer(options);
  const contentLabel = options.contentLabel;
  const additionalData = options.additionalData;
  let pendingPercentiles = (options.percentiles || []).slice(0);
  let lastTime = 0;
  let viewedMilliseconds = 0;
  let lastStartTime = null;

  function computePlayingTime() {
    if (lastStartTime !== null) {
      const delta = (new Date().getTime() - lastStartTime);

      viewedMilliseconds = viewedMilliseconds + delta;

      gtmDataLayer().push({
        event: 'videoDetail',
        eventCategory: 'video',
        eventAction: 'Totalidad minutos vistos',
        eventLabel: contentLabel,
        additionalData
      });
    }

    lastStartTime = null;
  }

  function onPlayerPlay(e) {
    computePlayingTime();
    lastStartTime = new Date().getTime();

    gtmDataLayer().push({
      event: 'videoDetail',
      eventCategory: 'video',
      eventAction: 'play',
      eventLabel: contentLabel,
      additionalData
    });
  }

  function onPlayerPause(e) {
    computePlayingTime();
    gtmDataLayer().push({
      event: 'videoDetail',
      eventCategory: 'video',
      eventAction: 'pause',
      eventLabel: contentLabel,
      additionalData
    });
  }

  function onPlayerEnded(e) {
    computePlayingTime();
  }

  let firstTimeUpdate = null;
  let initialized = false;

  function onTimeUpdate(e) {
    if (!initialized) {
      if (firstTimeUpdate === null) {
        firstTimeUpdate = Math.floor(player.currentTime());
      } else if (firstTimeUpdate !== Math.floor(player.currentTime)) {
        // reportar Inicio
        gtmDataLayer().push({
          event: 'videoDetail',
          eventCategory: 'video',
          eventAction: 'inicio',
          eventLabel: contentLabel,
          additionalData
        });

        initialized = true;
      }
    }

    if (lastTime > player.currentTime()) {
      const fraction = player.currentTime() / player.duration();

      // reset persentiles
      pendingPercentiles = options.percentiles.filter(p => p >= fraction);
    }

    if (pendingPercentiles.length && initialized) {
      const fraction = player.currentTime() / player.duration();
      const percentil = pendingPercentiles[0];

      if (fraction >= percentil) {
        gtmDataLayer().push({
          event: 'videoDetail',
          eventCategory: 'video',
          eventAction: 'consumo-porcentual',
          eventLabel: (percentil * 100) + '%',
          additionalData
        });

        pendingPercentiles.shift();
      }
    }

    lastTime = player.currentTime();
  }

  player.on('play', onPlayerPlay);
  player.on('ended', onPlayerEnded);
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
 * @function gtm
 * @param    {Object} [options={}]
 *           An object of options left to the plugin author to define.
 */
const gtm = function(options) {
  this.ready(() => {
    onPlayerReady(this, videojs.mergeOptions(defaults, options));
  });
};

// Register the plugin with video.js.
registerPlugin('gtm', gtm);

// Include the version number.
gtm.VERSION = VERSION;

export default gtm;
