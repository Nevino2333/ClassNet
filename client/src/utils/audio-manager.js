var audio = new Audio();
audio.crossOrigin = 'anonymous';
audio.preload = 'metadata';

var store = null;
var rafId = null;

function rafLoop() {
  if (store && !audio.paused) {
    store.commit('music/SET_CURRENT_TIME', audio.currentTime);
    store.dispatch('music/updateLyricIndex');
  }
  rafId = requestAnimationFrame(rafLoop);
}

export default {
  init: function (_store) {
    store = _store;

    audio.addEventListener('timeupdate', function () {
      store.commit('music/SET_CURRENT_TIME', audio.currentTime);
      store.dispatch('music/updateLyricIndex');
    });

    audio.addEventListener('loadedmetadata', function () {
      store.commit('music/SET_DURATION', audio.duration || 0);
    });

    audio.addEventListener('ended', function () {
      store.dispatch('music/next');
    });

    audio.addEventListener('play', function () {
      store.commit('music/SET_PLAYING', true);
    });

    audio.addEventListener('pause', function () {
      store.commit('music/SET_PLAYING', false);
    });

    audio.addEventListener('error', function () {
      store.commit('music/SET_PLAYING', false);
    });

    audio.addEventListener('progress', function () {
      if (!audio.buffered || audio.buffered.length === 0) return;
      var end = audio.buffered.end(audio.buffered.length - 1);
      store.commit('music/SET_BUFFERED_END', end);
    });

    rafLoop();
  },

  playSong: function (song) {
    audio.pause();
    var src = song.audioUrl || ('/api/music/stream/' + encodeURIComponent(song.file));
    audio.src = src;
    audio.load();
    audio.play().catch(function () {});
    store.commit('music/SET_CURRENT_SONG', song);
    store.commit('music/SET_PLAYING', true);
    store.commit('music/SET_CURRENT_TIME', 0);
    store.commit('music/SET_DURATION', 0);
  },

  pause: function () {
    audio.pause();
  },

  resume: function () {
    if (store && store.state.music && store.state.music.currentSong) {
      audio.play().catch(function () {});
    }
  },

  toggle: function () {
    if (audio.paused) {
      if (!audio.src && store && store.state.music && store.state.music.currentSong) {
        var song = store.state.music.currentSong;
        audio.src = song.audioUrl || ('/api/music/stream/' + encodeURIComponent(song.file));
        audio.load();
      }
      audio.play().catch(function () {});
    } else {
      audio.pause();
    }
  },

  seek: function (time) {
    audio.currentTime = time;
  },

  setVolume: function (vol) {
    audio.volume = vol;
    store.commit('music/SET_VOLUME', vol);
  },

  toggleMute: function () {
    audio.muted = !audio.muted;
    store.commit('music/SET_MUTED', audio.muted);
  },

  getAudio: function () {
    return audio;
  },

  destroy: function () {
    audio.pause();
    audio.removeEventListener('timeupdate');
    audio.removeEventListener('loadedmetadata');
    audio.removeEventListener('ended');
    audio.removeEventListener('play');
    audio.removeEventListener('pause');
    audio.removeEventListener('error');
    audio.removeEventListener('progress');
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    store = null;
  }
};
