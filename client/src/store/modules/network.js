var state = {
  online: true,
  lastOnlineTime: Date.now()
};

var mutations = {
  SET_ONLINE: function(state, value) {
    state.online = !!value;
    if (value) {
      state.lastOnlineTime = Date.now();
    }
  }
};

export default {
  namespaced: true,
  state: state,
  mutations: mutations
};
