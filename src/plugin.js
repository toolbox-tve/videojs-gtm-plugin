import videojs from 'video.js';
import {version as VERSION} from '../package.json';

const Plugin = videojs.getPlugin('plugin');

// Default options for the plugin.
const defaults = {
  contentTitle: '',
  additionalData: {
    name: 'Untitled'
  },
  contentLabel: 'Untitled',
  percentiles: []
};

// Cross-compatibility for Video.js 5 and 6.
const registerPlugin = videojs.registerPlugin || videojs.plugin;
// const dom = videojs.dom || videojs;

/**
 *  GTM Plugin main class
 */
class Gtm extends Plugin {
  /**
   * Create a gtm plugin instance.
   *
   * @param  {Player} player
   *         A Video.js Player instance.
   *
   * @param  {Object} [options]
   *         An optional options object.
   *
   *         While not a core part of the Video.js plugin architecture, a
   *         second argument of options is a convenient way to accept inputs
   *         from your plugin's caller.
   */
  constructor(player, options) {
    super(player);

    this.gtmDataLayer = this.createGtmDataLayer(options);

    if (options) {
      this.contentLabel = options.contentLabel;
      this.additionalData = options.additionalData;
      this.pendingPercentiles = (options.percentiles || []).slice(0);
      this.percentiles = options.percentiles;
    } else {
      this.contentLabel = '';
      this.additionalData = {};
      this.pendingPercentiles = [];
      this.percentiles = [];
    }

    this.lastTime = 0;
    this.firstTimeUpdate = null;

    this.options = videojs.mergeOptions(defaults, options);
    this.player.ready(() => {
      this.player.addClass('vjs-concurrence-limiter');

      const onPlayerPlay = this.onPlayerPlay.bind(this);
      const onPlayerDispose = this.onPlayerDispose.bind(this);
      const onPlayerPause = this.onPlayerPause.bind(this);
      const onTimeUpdate = this.onTimeUpdate.bind(this);
      const onWindowBeforeUpload = this.onWindowBeforeUpload.bind(this);

      this.player.on('play', onPlayerPlay);
      this.player.on('dispose', onPlayerDispose);
      this.player.on('pause', onPlayerPause);
      this.player.on('timeupdate', onTimeUpdate);

      window.addEventListener('beforeunload', onWindowBeforeUpload);

      this.onDispose = () => {
        // remove al event handlers
        this.player.off('play', onPlayerPlay);
        this.player.off('dispose', onPlayerDispose);
        this.player.off('pause', onPlayerPause);
        this.player.off('timeupdate', onTimeUpdate);

        window.removeEventListener('beforeunload', onWindowBeforeUpload);
      };

      player.addClass('vjs-tbx-gtm');
    });
  }

  /**
   * Deregisters all event handlers (method called from video.js).
   */
  dispose() {
    if (this.onDispose) {
      this.onDispose();
    }
    // Trigger the event needed on dispose
    super.dispose();
  }

  /**
   * send viewed time event
   */
  sendViewedTime() {
    this.computePlayingTime();
    this.gtmDataLayer().push({
      event: 'videoDetail',
      eventCategory: 'video',
      eventAction: parseFloat(this.viewedMinutes).toFixed(2),
      eventLabel: this.contentLabel,
      additionalData: this.additionalData
    });
  }

  /**
   * Computes playing time from recorded time states
   */
  computePlayingTime() {
    this.viewedMinutes = this.player.currentTime() / 60;
  }

  /**
   * Event handler for 'play' video.js event
   */
  onPlayerPlay() {
    this.gtmDataLayer().push({
      event: 'videoDetail',
      eventCategory: 'video',
      eventAction: 'play',
      eventLabel: this.contentLabel,
      additionalData: this.additionalData
    });
  }

  /**
   * Event handler for 'pause' video.js event
   */
  onPlayerPause() {
    this.gtmDataLayer().push({
      event: 'videoDetail',
      eventCategory: 'video',
      eventAction: 'pause',
      eventLabel: this.contentLabel,
      additionalData: this.additionalData
    });
  }

  /**
   * Event handler for 'ended' video.js event
   */
  onPlayerDispose() {
    this.sendViewedTime();
  }

  /**
   * Event handler for 'timeupdate' video.js event
   */
  onTimeUpdate() {
    if (!this.initialized) {
      if (this.firstTimeUpdate === null) {
        this.firstTimeUpdate = Math.floor(this.player.currentTime());
      } else if (this.firstTimeUpdate !== Math.floor(this.player.currentTime)) {
        // reportar Inicio
        this.gtmDataLayer().push({
          event: 'videoDetail',
          eventCategory: 'video',
          eventAction: 'inicio',
          eventLabel: this.contentLabel,
          additionalData: this.additionalData
        });

        this.initialized = true;
      }
    }

    if (this.lastTime > this.player.currentTime()) {
      const fraction = this.player.currentTime() / this.player.duration();

      // reset persentiles
      this.pendingPercentiles = this.percentiles.filter(p => p >= fraction);
    }

    if (this.pendingPercentiles.length && this.initialized) {
      const fraction = this.player.currentTime() / this.player.duration();
      const percentil = this.pendingPercentiles[0];

      if (fraction >= percentil) {
        this.gtmDataLayer().push({
          event: 'videoDetail',
          eventCategory: 'video',
          eventAction: 'consumo-porcentual',
          eventLabel: (percentil * 100) + '%',
          additionalData: this.additionalData
        });

        this.pendingPercentiles.shift();
      }
    }

    this.lastTime = this.player.currentTime();
  }

  /**
   * Event handler for 'beforunload' window event
   */
  onWindowBeforeUpload(event) {
    event.preventDefault();
    this.sendViewedTime();
  }

  /**
   * Creates a GTM Data layer based on plugin options
   *
   * @param  {Object} options
   *         Options object for the plugin
   *
   * @return {Function} gtmDayaLayer
   *         Function returning instance of gtmDataLayer
   */
  createGtmDataLayer(options) {
    const noDataLayer = {
      push: () => {}
    };

    if (!options) {
      return noDataLayer;
    }

    if (options.gtmDataLayer) {
      return () => options.gtmDataLayer;
    }

    if (!options.gtmKey) {
      return noDataLayer;
    }

    if (!window.dataLayer) {

      /* global document */
      const firstScriptTag = document.getElementsByTagName('script')[0];
      const newScriptTag = document.createElement('script');
      const key = options.gtmKey;

      newScriptTag.async = true;
      newScriptTag.src = 'https://www.googletagmanager.com/gtm.js?id=' + key + '&l=dataLayer';
      firstScriptTag.parentNode.insertBefore(newScriptTag, firstScriptTag);
    }

    /* global window */
    return () => window.dataLayer || noDataLayer;
  }
}

// Register the plugin with video.js.
registerPlugin('gtm', Gtm);

// Include the version number.
Gtm.VERSION = VERSION;

export default Gtm;
