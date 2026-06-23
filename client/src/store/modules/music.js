import audioManager from '@/utils/audio-manager';
import api from '@/utils/api';
import lrcParser from '@/utils/lrc-parser';

var state = {
  currentSong: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  playMode: 'sequence',
  playQueue: [],
  songs: [],
  lyrics: null,
  currentLyricIndex: -1,
  showPlayer: false,
  bufferedEnd: 0
};

var mutations = {
  SET_CURRENT_SONG: function (state, song) {
    state.currentSong = song;
  },
  SET_PLAYING: function (state, isPlaying) {
    state.isPlaying = isPlaying;
  },
  SET_CURRENT_TIME: function (state, time) {
    state.currentTime = time;
  },
  SET_DURATION: function (state, duration) {
    state.duration = duration;
  },
  SET_VOLUME: function (state, volume) {
    state.volume = volume;
  },
  SET_MUTED: function (state, isMuted) {
    state.isMuted = isMuted;
  },
  SET_PLAY_MODE: function (state, mode) {
    state.playMode = mode;
  },
  SET_PLAY_QUEUE: function (state, queue) {
    state.playQueue = queue;
  },
  SET_SONGS: function (state, songs) {
    state.songs = songs;
  },
  SET_LYRICS: function (state, lyrics) {
    state.lyrics = lyrics;
  },
  SET_CURRENT_LYRIC_INDEX: function (state, index) {
    state.currentLyricIndex = index;
  },
  SET_SHOW_PLAYER: function (state, show) {
    state.showPlayer = show;
  },
  SET_BUFFERED_END: function (state, end) {
    state.bufferedEnd = end;
  }
};

var actions = {
  play: function (_ref, song) {
    var commit = _ref.commit;
    audioManager.playSong(song);
    commit('SET_CURRENT_SONG', song);
    commit('SET_PLAYING', true);
  },
  pause: function (_ref) {
    var commit = _ref.commit;
    audioManager.pause();
    commit('SET_PLAYING', false);
  },
  toggle: function (_ref) {
    audioManager.toggle();
  },
  next: function (_ref) {
    var commit = _ref.commit;
    var dispatch = _ref.dispatch;
    var state = _ref.state;
    var queue = state.playQueue.length > 0 ? state.playQueue : state.songs;
    var current = state.currentSong;
    var mode = state.playMode;
    if (!queue.length || !current) return;
    var index = queue.findIndex(function (s) { return s.id === current.id; });
    if (index === -1) index = 0;
    var nextSong;
    if (mode === 'shuffle') {
      var nextIndex = Math.floor(Math.random() * queue.length);
      nextSong = queue[nextIndex];
    } else if (mode === 'repeat-one') {
      audioManager.seek(0);
      audioManager.resume();
      return;
    } else {
      var nextIdx = (index + 1) % queue.length;
      nextSong = queue[nextIdx];
    }
    commit('SET_CURRENT_LYRIC_INDEX', -1);
    commit('SET_LYRICS', null);
    audioManager.playSong(nextSong);
    dispatch('fetchLyrics', nextSong);
  },
  prev: function (_ref) {
    var commit = _ref.commit;
    var dispatch = _ref.dispatch;
    var state = _ref.state;
    var queue = state.playQueue.length > 0 ? state.playQueue : state.songs;
    var current = state.currentSong;
    if (!queue.length || !current) return;
    var index = queue.findIndex(function (s) { return s.id === current.id; });
    if (index === -1) index = 0;
    var prevIdx = (index - 1 + queue.length) % queue.length;
    var prevSong = queue[prevIdx];
    commit('SET_CURRENT_LYRIC_INDEX', -1);
    commit('SET_LYRICS', null);
    audioManager.playSong(prevSong);
    dispatch('fetchLyrics', prevSong);
  },
  seek: function (_ref, time) {
    audioManager.seek(time);
  },
  updateTime: function (_ref, time) {
    var commit = _ref.commit;
    commit('SET_CURRENT_TIME', time);
  },
  updateLyricIndex: function (_ref) {
    var commit = _ref.commit;
    var state = _ref.state;
    var lyrics = state.lyrics;
    var currentTime = state.currentTime;
    if (!lyrics || !lyrics.lines || !lyrics.lines.length) return;
    var index = -1;
    for (var i = 0; i < lyrics.lines.length; i++) {
      if (lyrics.lines[i].time <= currentTime) {
        index = i;
      } else {
        break;
      }
    }
    if (index !== state.currentLyricIndex) {
      commit('SET_CURRENT_LYRIC_INDEX', index);
    }
  },
  fetchLyrics: function (_ref, song) {
    var commit = _ref.commit;
    var state = _ref.state;
    if (!song) return;
    if (!song.hasLyrics || !song.lyricsUrl) {
      commit('SET_LYRICS', null);
      return;
    }
    api.get(song.lyricsUrl).then(function (res) {
      if (state.currentSong && state.currentSong.id === song.id) {
        if (res.data.code === 200 && res.data.data && res.data.data.content) {
          commit('SET_LYRICS', Object.freeze(lrcParser.parseLRC(res.data.data.content)));
        } else {
          commit('SET_LYRICS', null);
        }
      }
    }).catch(function () {
      if (state.currentSong && state.currentSong.id === song.id) {
        commit('SET_LYRICS', null);
      }
    });
  }
};

var getters = {
  hasCurrentSong: function (state) {
    return !!state.currentSong;
  },
  currentLyric: function (state) {
    if (!state.lyrics || !state.lyrics.lines || state.currentLyricIndex < 0 || state.currentLyricIndex >= state.lyrics.lines.length) {
      return '';
    }
    return state.lyrics.lines[state.currentLyricIndex].text || '';
  },
  nextLyric: function (state) {
    if (!state.lyrics || !state.lyrics.lines || state.currentLyricIndex + 1 < 0 || state.currentLyricIndex + 1 >= state.lyrics.lines.length) {
      return '';
    }
    return state.lyrics.lines[state.currentLyricIndex + 1].text || '';
  },
  progressPercent: function (state) {
    if (!state.duration) return 0;
    return (state.currentTime / state.duration) * 100;
  },
  formattedTime: function (state) {
    var minutes = Math.floor(state.currentTime / 60);
    var seconds = Math.floor(state.currentTime % 60);
    return (minutes < 10 ? '0' + minutes : minutes) + ':' + (seconds < 10 ? '0' + seconds : seconds);
  },
  formattedDuration: function (state) {
    var minutes = Math.floor(state.duration / 60);
    var seconds = Math.floor(state.duration % 60);
    return (minutes < 10 ? '0' + minutes : minutes) + ':' + (seconds < 10 ? '0' + seconds : seconds);
  }
};

export default {
  namespaced: true,
  state: state,
  mutations: mutations,
  actions: actions,
  getters: getters
};
