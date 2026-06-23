var state = {
  activities: []
};

var mutations = {
  START_ACTIVITY: function(s, activity) {
    var idx = -1;
    for (var i = 0; i < s.activities.length; i++) {
      if (s.activities[i].id === activity.id) { idx = i; break; }
    }
    if (idx >= 0) {
      s.activities.splice(idx, 1, Object.assign({}, s.activities[idx], activity));
    } else {
      s.activities.push(Object.assign({}, activity));
    }
  },
  UPDATE_ACTIVITY: function(s, payload) {
    for (var i = 0; i < s.activities.length; i++) {
      if (s.activities[i].id === payload.id) {
        s.activities.splice(i, 1, Object.assign({}, s.activities[i], payload.updates));
        break;
      }
    }
  },
  END_ACTIVITY: function(s, activityId) {
    s.activities = s.activities.filter(function(a) { return a.id !== activityId; });
  }
};

export default {
  namespaced: true,
  state: state,
  mutations: mutations
};
