import _classCallCheck from '@babel/runtime/helpers/classCallCheck';
import _createClass from '@babel/runtime/helpers/createClass';
import _get from '@babel/runtime/helpers/get';
import _inherits from '@babel/runtime/helpers/inherits';
import _possibleConstructorReturn from '@babel/runtime/helpers/possibleConstructorReturn';
import _getPrototypeOf from '@babel/runtime/helpers/getPrototypeOf';
import { Events, Log, ContainerPlugin } from '@clappr/core';
import get from 'lodash.get';

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

var ClapprStats = /*#__PURE__*/function (_ContainerPlugin) {
  _inherits(ClapprStats, _ContainerPlugin);

  var _super = _createSuper(ClapprStats);

  //eslint-disable-line no-console
  function ClapprStats(container) {
    var _this;

    _classCallCheck(this, ClapprStats);

    _this = _super.call(this, container);
    _this._runEach = get(container, 'options.clapprStats.runEach', 5000);
    _this._onReport = get(container, 'options.clapprStats.onReport', _this._defaultReport);
    _this._uriToMeasureLatency = get(container, 'options.clapprStats.uriToMeasureLatency');
    _this._urisToMeasureBandwidth = get(container, 'options.clapprStats.urisToMeasureBandwidth');
    _this._runBandwidthTestEvery = get(container, 'options.clapprStats.runBandwidthTestEvery', 10);
    _this._bwMeasureCount = 0;
    _this._completion = {
      watch: get(container, 'options.clapprStats.onCompletion', []),
      calls: []
    };

    _this._newMetrics();

    _this.on(ClapprStats.REPORT_EVENT, _this._onReport);

    return _this;
  }

  _createClass(ClapprStats, [{
    key: "name",
    get: function get() {
      return 'clappr_stats';
    }
  }, {
    key: "supportedVersion",
    get: function get() {
      return {
        min: '0.4.2'
      };
    }
  }, {
    key: "_playbackName",
    get: function get() {
      return this.container.playback.name;
    }
  }, {
    key: "_playbackType",
    get: function get() {
      return this.container.getPlaybackType();
    }
  }, {
    key: "_now",
    value: function _now() {
      var hasPerformanceSupport = window.performance && typeof window.performance.now === 'function';
      return hasPerformanceSupport ? window.performance.now() : new Date();
    }
  }, {
    key: "_inc",
    value: function _inc(counter) {
      this._metrics.counters[counter] += 1;
    }
  }, {
    key: "_timerHasStarted",
    value: function _timerHasStarted(timer) {
      return this["_start".concat(timer)] !== undefined;
    }
  }, {
    key: "_start",
    value: function _start(timer) {
      this["_start".concat(timer)] = this._now();
    }
  }, {
    key: "_stop",
    value: function _stop(timer) {
      this._metrics.timers[timer] += this._now() - this["_start".concat(timer)];
    }
  }, {
    key: "_defaultReport",
    value: function _defaultReport(metrics) {
      console.log(metrics);
    }
  }, {
    key: "bindEvents",
    value: function bindEvents() {
      var _this2 = this;

      this.listenTo(this.container, Events.CONTAINER_BITRATE, this.onBitrate);
      this.listenTo(this.container, Events.CONTAINER_STOP, this.stopReporting);
      this.listenTo(this.container, Events.CONTAINER_ENDED, this.stopReporting);
      this.listenToOnce(this.container.playback, Events.PLAYBACK_PLAY_INTENT, this.startTimers);
      this.listenToOnce(this.container, Events.CONTAINER_PLAY, this.onFirstPlaying);
      this.listenTo(this.container, Events.CONTAINER_PLAY, this.onPlay);
      this.listenTo(this.container, Events.CONTAINER_PAUSE, this.onPause);
      this.listenToOnce(this.container, Events.CONTAINER_STATE_BUFFERING, this.onBuffering);
      this.listenTo(this.container, Events.CONTAINER_SEEK, this.onSeek);
      this.listenTo(this.container, Events.CONTAINER_ERROR, function () {
        return _this2._inc('error');
      });
      this.listenTo(this.container, Events.CONTAINER_FULLSCREEN, function () {
        return _this2._inc('fullscreen');
      });
      this.listenTo(this.container, Events.CONTAINER_PLAYBACKDVRSTATECHANGED, function (dvrInUse) {
        dvrInUse && _this2._inc('dvrUsage');
      });
      this.listenTo(this.container.playback, Events.PLAYBACK_PROGRESS, this.onProgress);
      this.listenTo(this.container.playback, Events.PLAYBACK_TIMEUPDATE, this.onTimeUpdate);
    }
  }, {
    key: "destroy",
    value: function destroy() {
      this.stopReporting();

      _get(_getPrototypeOf(ClapprStats.prototype), "destroy", this).call(this);
    }
  }, {
    key: "onBitrate",
    value: function onBitrate(newBitrate) {
      var bitrate = parseInt(get(newBitrate, 'bitrate', 0), 10);

      var now = this._now();

      if (this._metrics.extra.bitratesHistory.length > 0) {
        var beforeLast = this._metrics.extra.bitratesHistory[this._metrics.extra.bitratesHistory.length - 1];
        beforeLast.end = now;
        beforeLast.time = now - beforeLast.start;
      }

      this._metrics.extra.bitratesHistory.push({
        start: this._now(),
        bitrate: bitrate
      });

      this._inc('changeLevel');
    }
  }, {
    key: "stopReporting",
    value: function stopReporting() {
      this._buildReport();

      clearInterval(this._intervalId);

      this._newMetrics();

      this.stopListening();
      this.bindEvents();
    }
  }, {
    key: "startTimers",
    value: function startTimers() {
      this._intervalId = setInterval(this._buildReport.bind(this), this._runEach);

      this._start('session');

      this._start('startup');
    }
  }, {
    key: "onFirstPlaying",
    value: function onFirstPlaying() {
      this.listenTo(this.container, Events.CONTAINER_TIMEUPDATE, this.onContainerUpdateWhilePlaying);

      this._start('watch');

      this._stop('startup');
    }
  }, {
    key: "playAfterPause",
    value: function playAfterPause() {
      this.listenTo(this.container, Events.CONTAINER_TIMEUPDATE, this.onContainerUpdateWhilePlaying);

      this._stop('pause');

      this._start('watch');
    }
  }, {
    key: "onPlay",
    value: function onPlay() {
      this._inc('play');
    }
  }, {
    key: "onPause",
    value: function onPause() {
      this._stop('watch');

      this._start('pause');

      this._inc('pause');

      this.listenToOnce(this.container, Events.CONTAINER_PLAY, this.playAfterPause);
      this.stopListening(this.container, Events.CONTAINER_TIMEUPDATE, this.onContainerUpdateWhilePlaying);
    }
  }, {
    key: "onSeek",
    value: function onSeek(e) {
      this._inc('seek');

      this._metrics.extra.watchHistory.push([e * 1000, e * 1000]);
    }
  }, {
    key: "onTimeUpdate",
    value: function onTimeUpdate(e) {
      var current = e.current * 1000,
          total = e.total * 1000,
          l = this._metrics.extra.watchHistory.length;
      this._metrics.extra.duration = total;
      this._metrics.extra.currentTime = current;
      this._metrics.extra.watchedPercentage = current / total * 100;

      if (l === 0) {
        this._metrics.extra.watchHistory.push([current, current]);
      } else {
        this._metrics.extra.watchHistory[l - 1][1] = current;
      }

      if (this._metrics.extra.bitratesHistory.length > 0) {
        var lastBitrate = this._metrics.extra.bitratesHistory[this._metrics.extra.bitratesHistory.length - 1];

        if (!lastBitrate.end) {
          lastBitrate.time = this._now() - lastBitrate.start;
        }
      }

      this._onCompletion();
    }
  }, {
    key: "onContainerUpdateWhilePlaying",
    value: function onContainerUpdateWhilePlaying() {
      if (this.container.playback.isPlaying()) {
        this._stop('watch');

        this._start('watch');
      }
    }
  }, {
    key: "onBuffering",
    value: function onBuffering() {
      this._inc('buffering');

      this._start('buffering');

      this.listenToOnce(this.container, Events.CONTAINER_STATE_BUFFERFULL, this.onBufferfull);
    }
  }, {
    key: "onBufferfull",
    value: function onBufferfull() {
      this._stop('buffering');

      this.listenToOnce(this.container, Events.CONTAINER_STATE_BUFFERING, this.onBuffering);
    }
  }, {
    key: "onProgress",
    value: function onProgress(progress) {
      this._metrics.extra.buffersize = progress.current * 1000;
    }
  }, {
    key: "_newMetrics",
    value: function _newMetrics() {
      this._metrics = {
        counters: {
          play: 0,
          pause: 0,
          error: 0,
          buffering: 0,
          decodedFrames: 0,
          droppedFrames: 0,
          fps: 0,
          changeLevel: 0,
          seek: 0,
          fullscreen: 0,
          dvrUsage: 0
        },
        timers: {
          startup: 0,
          watch: 0,
          pause: 0,
          buffering: 0,
          session: 0,
          latency: 0
        },
        extra: {
          playbackName: '',
          playbackType: '',
          bitratesHistory: [],
          bitrateWeightedMean: 0,
          bitrateMostUsed: 0,
          buffersize: 0,
          watchHistory: [],
          watchedPercentage: 0,
          bufferingPercentage: 0,
          bandwidth: 0,
          duration: 0,
          currentTime: 0
        }
      };
    }
  }, {
    key: "_onCompletion",
    value: function _onCompletion() {
      var currentPercentage = this._metrics.extra.watchedPercentage;
      var allPercentages = this._completion.watch;
      var isCalled = this._completion.calls.indexOf(currentPercentage) != -1;

      if (allPercentages.indexOf(currentPercentage) != -1 && !isCalled) {
        Log.info(this.name + ' PERCENTAGE_EVENT: ' + currentPercentage);

        this._completion.calls.push(currentPercentage);

        this.trigger(ClapprStats.PERCENTAGE_EVENT, currentPercentage);
      }
    }
  }, {
    key: "_buildReport",
    value: function _buildReport() {
      this._stop('session');

      this._start('session');

      this._metrics.extra.playbackName = this._playbackName;
      this._metrics.extra.playbackType = this._playbackType;

      this._calculateBitrates();

      this._calculatePercentages();

      this._fetchFPS();

      this._measureLatency();

      this._measureBandwidth();

      this.trigger(ClapprStats.REPORT_EVENT, JSON.parse(JSON.stringify(this._metrics)));
    }
  }, {
    key: "_fetchFPS",
    value: function _fetchFPS() {
      // flashls ??? - hls.droppedFramesl hls.stream.bufferLength (seconds)
      // hls ??? (use the same?)
      var fetchFPS = {
        'html5_video': this._html5FetchFPS,
        'hls': this._html5FetchFPS,
        'dash_shaka_playback': this._html5FetchFPS
      };
      fetchFPS[this._playbackName] && fetchFPS[this._playbackName].call(this);
    }
  }, {
    key: "_calculateBitrates",
    value: function _calculateBitrates() {
      var totalTime = this._metrics.extra.bitratesHistory.map(function (x) {
        return x.time;
      }).reduce(function (a, b) {
        return a + b;
      }, 0);

      this._metrics.extra.bitrateWeightedMean = this._metrics.extra.bitratesHistory.map(function (x) {
        return x.bitrate * x.time;
      }).reduce(function (a, b) {
        return a + b;
      }, 0) / totalTime;

      if (this._metrics.extra.bitratesHistory.length > 0) {
        this._metrics.extra.bitrateMostUsed = this._metrics.extra.bitratesHistory.slice().sort(function (a, b) {
          return a.time < b.time;
        })[0].bitrate;
      }
    }
  }, {
    key: "_calculatePercentages",
    value: function _calculatePercentages() {
      if (this._metrics.extra.duration > 0) {
        this._metrics.extra.bufferingPercentage = this._metrics.timers.buffering / this._metrics.extra.duration * 100;
      }
    }
  }, {
    key: "_html5FetchFPS",
    value: function _html5FetchFPS() {
      var videoTag = this.container.playback.el;
      var decodedFrames = videoTag.webkitDecodedFrameCount || videoTag.mozDecodedFrames || 0;
      var droppedFrames = videoTag.webkitDroppedFrameCount || videoTag.mozParsedFrames - videoTag.mozDecodedFrames || 0;
      var decodedFramesLastTime = decodedFrames - (this._lastDecodedFramesCount || 0);
      this._metrics.counters.decodedFrames = decodedFrames;
      this._metrics.counters.droppedFrames = droppedFrames;
      this._metrics.counters.fps = decodedFramesLastTime / (this._runEach / 1000);
      this._lastDecodedFramesCount = decodedFrames;
    } // originally from https://www.smashingmagazine.com/2011/11/analyzing-network-characteristics-using-javascript-and-the-dom-part-1/

  }, {
    key: "_measureLatency",
    value: function _measureLatency() {
      var _this3 = this;

      if (this._uriToMeasureLatency) {
        var t = [],
            n = 2,
            rtt;

        var ld = function ld() {
          t.push(_this3._now());
          if (t.length > n) done();else {
            var img = new Image();
            img.onload = ld;
            img.src = _this3._uriToMeasureLatency + '?' + Math.random() + '=' + _this3._now();
          }
        };

        var done = function done() {
          rtt = t[2] - t[1];
          _this3._metrics.timers.latency = rtt;
        };

        ld();
      }
    } // originally from https://www.smashingmagazine.com/2011/11/analyzing-network-characteristics-using-javascript-and-the-dom-part-1/

  }, {
    key: "_measureBandwidth",
    value: function _measureBandwidth() {
      var _this4 = this;

      if (this._urisToMeasureBandwidth && this._bwMeasureCount % this._runBandwidthTestEvery == 0) {
        var i = 0;

        var ld = function ld(e) {
          if (i > 0) {
            _this4._urisToMeasureBandwidth[i - 1].end = _this4._now();
            clearTimeout(_this4._urisToMeasureBandwidth[i - 1].timer);
          }

          if (i >= _this4._urisToMeasureBandwidth.length || i > 0 && _this4._urisToMeasureBandwidth[i - 1].expired) done(e);else {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', _this4._urisToMeasureBandwidth[i].url, true);
            xhr.responseType = 'arraybuffer';
            xhr.onload = xhr.onabort = ld;
            _this4._urisToMeasureBandwidth[i].start = _this4._now();
            _this4._urisToMeasureBandwidth[i].timer = setTimeout(function (j) {
              _this4._urisToMeasureBandwidth[j].expired = true;
              xhr.abort();
            }, _this4._urisToMeasureBandwidth[i].timeout, i);
            xhr.send();
          }
          i++;
        };

        var done = function done(e) {
          var timeSpent = (_this4._urisToMeasureBandwidth[i - 1].end - _this4._urisToMeasureBandwidth[i - 1].start) / 1000;
          var bandwidthBps = e.loaded * 8 / timeSpent;
          _this4._metrics.extra.bandwidth = bandwidthBps;

          _this4._urisToMeasureBandwidth.forEach(function (x) {
            x.start = 0;
            x.end = 0;
            x.expired = false;
            clearTimeout(x.timer);
          });
        };

        ld();
      }

      this._bwMeasureCount++;
    }
  }]);

  return ClapprStats;
}(ContainerPlugin);
ClapprStats.REPORT_EVENT = 'clappr:stats:report';
ClapprStats.PERCENTAGE_EVENT = 'clappr:stats:percentage';

export default ClapprStats;
