var CacheManager = {
  cache: {},
  get: function(key) {
    var item = this.cache[key];
    if (!item) return null;
    if (Date.now() - item.timestamp > item.ttl) {
      delete this.cache[key];
      return null;
    }
    return item.data;
  },
  set: function(key, data, ttl) {
    this.cache[key] = { data: data, timestamp: Date.now(), ttl: ttl };
  },
  clear: function(key) {
    if (key) {
      delete this.cache[key];
    } else {
      this.cache = {};
    }
  }
};

module.exports = CacheManager;
