var axios = require('axios');
var config = require('../config');

function search(query, options) {
  var opts = options || {};
  var body = {
    query: query,
    search_depth: opts.searchDepth || config.tavily.searchDepth,
    max_results: opts.maxResults || config.tavily.maxResults,
    include_answer: true,
    topic: opts.topic || 'general'
  };

  if (opts.timeRange) body.time_range = opts.timeRange;

  return axios.post(config.tavily.apiUrl, body, {
    headers: {
      'Authorization': 'Bearer ' + config.tavily.apiKey,
      'Content-Type': 'application/json'
    },
    timeout: 15000
  }).then(function(res) {
    var data = res.data;
    var results = (data.results || []).map(function(r) {
      return { title: r.title, url: r.url, content: r.content };
    });
    return {
      answer: data.answer || '',
      results: results,
      credits: (data.usage && data.usage.credits) || 1
    };
  }).catch(function(err) {
    var msg = err.response ? (err.response.data && err.response.data.error) || err.message : err.message;
    throw new Error('Tavily search failed: ' + msg);
  });
}

module.exports = { search: search };
