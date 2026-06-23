var axios = require('axios');
var config = require('../config');

var MAX_RETRIES = 2;
var RETRY_DELAY = 1000;
var RETRYABLE_STATUS = [429, 500, 502, 503, 504];

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

function getProvider(provider) {
  if (provider === 'deepseek') {
    return {
      apiUrl: config.deepseek.apiUrl,
      apiKey: config.deepseek.apiKey,
      model: config.deepseek.model
    };
  }
  return {
    apiUrl: config.ai.apiUrl,
    apiKey: config.ai.apiKey,
    model: config.ai.model
  };
}

function buildRequestBody(messages, options, provider) {
  var p = getProvider(provider);
  var body = {
    model: options.model || p.model,
    messages: messages,
    stream: !!options.stream
  };

  if (provider === 'deepseek') {
    if (options.thinking) {
      body.thinking = { type: 'enabled' };
      if (options.reasoningEffort) {
        body.reasoning_effort = options.reasoningEffort;
      }
      // Per DeepSeek docs: thinking mode ignores temperature/top_p/presence_penalty/frequency_penalty
      body.max_tokens = options.maxTokens || 4096;
    } else {
      body.temperature = options.temperature || 0.5;
      body.max_tokens = options.maxTokens || 1500;
    }
    if (options.userId) {
      body.user = String(options.userId);
    }
    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools;
      body.tool_choice = options.toolChoice || 'auto';
    }
  } else {
    body.temperature = options.temperature || 0.7;
    body.max_tokens = options.maxTokens || 2000;
  }

  return { url: p.apiUrl, headers: { 'Authorization': 'Bearer ' + p.apiKey, 'Content-Type': 'application/json' }, body: body };
}

// Error thrown when API returns HTTP 200 but body contains an error object
function ApiBodyError(message, code, apiResponse) {
  this.name = 'ApiBodyError';
  this.message = message || 'AI API 返回错误';
  this.code = code || 'api_error';
  this.apiError = true;
  this.apiResponse = apiResponse || null;
}
ApiBodyError.prototype = Object.create(Error.prototype);
ApiBodyError.prototype.constructor = ApiBodyError;

function checkApiResponseBody(data) {
  // Some API proxies (like free.v36.cm) return HTTP 200 with an error body
  // instead of proper HTTP error status codes.
  if (data && data.error) {
    var errMsg = '';
    var errCode = '';
    if (typeof data.error === 'object') {
      errMsg = data.error.message || JSON.stringify(data.error);
      errCode = data.error.code || data.error.type || '';
    } else if (typeof data.error === 'string') {
      errMsg = data.error;
    }
    throw new ApiBodyError(errMsg, errCode, data);
  }
  // Also check: response without choices and without error is suspicious
  if (data && !data.choices && !data.error) {
    throw new ApiBodyError('AI API 返回了无效的响应格式', 'invalid_response', data);
  }
  return data;
}

function chatWithAI(messages, options) {
  var opts = options || {};
  var retryCount = opts._retryCount || 0;
  var req = buildRequestBody(messages, opts, opts.provider);

  return axios.post(req.url, req.body, {
    headers: req.headers,
    timeout: opts.thinking ? 300000 : 120000
  }).then(function(response) {
    return checkApiResponseBody(response.data);
  }).catch(function(err) {
    // Don't retry ApiBodyError (quota, invalid key, etc.)
    if (err.apiError) throw err;
    var status = err.response ? err.response.status : 0;
    var shouldRetry = retryCount < MAX_RETRIES && (
      RETRYABLE_STATUS.indexOf(status) > -1 ||
      err.code === 'ECONNABORTED' ||
      err.code === 'ECONNRESET' ||
      err.code === 'ETIMEDOUT' ||
      err.code === 'ECONNREFUSED'
    );

    if (shouldRetry) {
      var delay = RETRY_DELAY * Math.pow(2, retryCount);
      if (status === 429) {
        if (err.response && err.response.headers) {
          var retryAfter = err.response.headers['retry-after'];
          if (retryAfter) delay = parseInt(retryAfter, 10) * 1000 || delay;
        }
        delay = Math.max(delay, 2000);
      }
      return sleep(delay).then(function() {
        return chatWithAI(messages, Object.assign({}, opts, { _retryCount: retryCount + 1 }));
      });
    }
    throw err;
  });
}

function chatWithAIStream(messages, res, options) {
  var opts = options || {};
  var onContent = opts.onContent || null;
  var onReasoning = opts.onReasoning || null;
  var enableThinking = !!opts.thinking;
  var req = buildRequestBody(messages, Object.assign({}, opts, { stream: true }), opts.provider);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  function sendSSE(data) {
    res.write('data: ' + JSON.stringify(data) + '\n\n');
  }

  return new Promise(function(resolve, reject) {
    axios.post(req.url, req.body, {
      headers: req.headers,
      responseType: 'stream',
      timeout: opts.thinking ? 300000 : 120000
    }).then(function(response) {
      // Detect non-stream error responses: some API proxies return
      // HTTP 200 with JSON error body instead of SSE stream.
      var contentType = response.headers['content-type'] || '';
      if (contentType.indexOf('application/json') >= 0) {
        // Collect the JSON body and check for API error
        var chunks = [];
        response.data.on('data', function(c) { chunks.push(c); });
        response.data.on('end', function() {
          try {
            var body = JSON.parse(Buffer.concat(chunks).toString());
            checkApiResponseBody(body);
            // If no error thrown, fall through to treat as empty response
            reject(new ApiBodyError('流式请求返回了非流式响应', 'stream_expected'));
          } catch (e) {
            reject(e.apiError ? e : new ApiBodyError('无法解析 AI 响应: ' + (e.message || '未知错误'), 'parse_error'));
          }
        });
        response.data.on('error', function(err) { reject(err); });
        return;
      }

      var sseBuffer = '';
      var streamError = null;
      var doneSent = false;

      response.data.on('data', function(chunk) {
        sseBuffer += chunk.toString();
        var lines = sseBuffer.split('\n');
        sseBuffer = lines.pop();

        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line || line.startsWith(':')) continue;
          if (!line.startsWith('data: ')) continue;

          var data = line.substring(6);
          if (data === '[DONE]') {
            if (!doneSent) { doneSent = true; sendSSE({ done: true }); }
            continue;
          }
          try {
            var parsed = JSON.parse(data);
            if (parsed.choices && parsed.choices[0]) {
              var delta = parsed.choices[0].delta;
              if (delta) {
                if (delta.reasoning_content && enableThinking) {
                  if (onReasoning) onReasoning(delta.reasoning_content);
                  sendSSE({ reasoning: delta.reasoning_content });
                }
                if (delta.content) {
                  if (onContent) onContent(delta.content);
                  sendSSE({ content: delta.content });
                }
                if (delta.tool_calls) {
                  sendSSE({ tool_calls: delta.tool_calls });
                }
              }
              if (parsed.choices[0].finish_reason === 'tool_calls') {
                sendSSE({ finish_reason: 'tool_calls' });
              }
              if (parsed.choices[0].finish_reason === 'stop') {
                if (!doneSent) { doneSent = true; sendSSE({ done: true }); }
              }
            }
            if (parsed.usage) {
              sendSSE({ usage: parsed.usage });
              var hitTokens = parsed.usage.prompt_cache_hit_tokens || 0;
              var missTokens = parsed.usage.prompt_cache_miss_tokens || 0;
              var totalTokens = parsed.usage.prompt_tokens || 0;
              if (totalTokens > 0) {
                var rate = Math.round(hitTokens / totalTokens * 100);
                console.log('[Cache:Stream] hit=%d miss=%d rate=%d%%', hitTokens, missTokens, rate);
              }
            }
          } catch (e) {}
        }
      });

      response.data.on('end', function() {
        sseBuffer = '';
        if (!doneSent) { doneSent = true; sendSSE({ done: true }); }
        res.end();
        if (streamError) {
          reject(streamError);
        } else {
          resolve();
        }
      });

      response.data.on('error', function(err) {
        console.error('AI stream error:', err);
        streamError = err;
        sendSSE({ error: 'AI 服务出错' });
        res.end();
        reject(err);
      });
    }).catch(function(err) {
      console.error('AI API error:', err.message);
      // Extract API error body if present (some proxies return error details in body)
      var apiBodyMsg = '';
      if (err.response && err.response.data) {
        // err.response.data may be a string, object, or Readable stream (in stream mode)
        var respData = err.response.data;
        if (typeof respData === 'string') {
          try { respData = JSON.parse(respData); } catch (e) {}
        }
        if (respData && typeof respData === 'object' && !respData.pipe) { // not a stream
          if (respData.error) {
            apiBodyMsg = typeof respData.error === 'object' ? (respData.error.message || '') : String(respData.error);
          }
        }
      }
      var errorMsg = apiBodyMsg || 'AI 服务暂时不可用';
      if (err.apiError) {
        errorMsg = err.message || errorMsg;
      } else if (err.code === 'ECONNABORTED') {
        errorMsg = 'AI 响应超时，请稍后重试';
      } else if (err.code === 'ECONNREFUSED') {
        errorMsg = '无法连接到 AI 服务';
      } else if (err.response) {
        var status = err.response.status;
        if (status === 401) errorMsg = 'API 密钥无效';
        else if (status === 402) errorMsg = 'AI 服务余额不足，请联系管理员';
        else if (status === 429) errorMsg = '请求过于频繁，请稍后再试';
        else if (status === 422) errorMsg = '请求参数错误';
        else if (status === 404) errorMsg = 'AI 模型不可用';
        else if (status >= 500) errorMsg = 'AI 服务内部错误，请稍后重试';
        else if (err.response.data && err.response.data.error) {
          var apiErr = err.response.data.error;
          errorMsg = (typeof apiErr === 'object' ? apiErr.message : apiErr) || 'AI 服务出错';
        }
      } else if (err.code === 'ERR_NETWORK') {
        errorMsg = '网络连接失败，请检查服务器网络';
      }
      if (!res.headersSent) {
        res.status(502).json({ code: 502, message: errorMsg });
      } else {
        sendSSE({ error: errorMsg });
        res.end();
      }
      reject(err);
    });
  });
}

module.exports = { chatWithAI: chatWithAI, chatWithAIStream: chatWithAIStream };
