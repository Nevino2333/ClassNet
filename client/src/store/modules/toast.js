var state = {
  show: false,
  message: '',
  type: 'info'
};

var _toastTimer = null;

var mutations = {
  SHOW_TOAST: function(state, payload) {
    if (_toastTimer) {
      clearTimeout(_toastTimer);
    }
    state.show = true;
    state.message = payload.message || '';
    state.type = payload.type || 'info';
    var duration = payload.duration || 3000;
    _toastTimer = setTimeout(function() {
      state.show = false;
      state.message = '';
    }, duration);
  },
  HIDE_TOAST: function(state) {
    state.show = false;
    state.message = '';
    if (_toastTimer) {
      clearTimeout(_toastTimer);
      _toastTimer = null;
    }
  }
};

export default {
  namespaced: true,
  state: state,
  mutations: mutations
};
