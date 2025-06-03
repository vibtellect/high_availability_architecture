module.exports = {
  generateRandomProductId,
  validateResponse,
  logCustomMetric,
  simulateUserBehavior,
  checkPerformanceThreshold,
  generateTestData
};

/**
 * Assigns a random product ID from a predefined list to the context for use in subsequent requests.
 *
 * The selected product ID is stored in {@link context.vars.randomProductId}.
 */
function generateRandomProductId(requestParams, context, ee, next) {
  const productIds = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  context.vars.randomProductId = productIds[Math.floor(Math.random() * productIds.length)];
  return next();
}

/**
 * Validates the HTTP response status and JSON body, emitting error counters for non-200 status, invalid JSON, or empty responses.
 *
 * Emits specific error events if the response status is not 200, if the JSON body is invalid, or if the parsed JSON is empty.
 */
function validateResponse(requestParams, response, context, ee, next) {
  if (response.statusCode !== 200) {
    ee.emit('counter', 'errors.status_not_200', 1);
  }
  
  if (response.headers['content-type'] && 
      response.headers['content-type'].includes('application/json')) {
    try {
      const body = JSON.parse(response.body);
      if (!body || Object.keys(body).length === 0) {
        ee.emit('counter', 'errors.empty_response', 1);
      }
    } catch (e) {
      ee.emit('counter', 'errors.invalid_json', 1);
    }
  }
  
  return next();
}

/**
 * Emits custom metrics for response time, including counters for slow responses and a response time histogram.
 *
 * Emits a counter if the response time exceeds 1000 ms or 2000 ms, and always emits a histogram event with the response time in milliseconds.
 */
function logCustomMetric(requestParams, response, context, ee, next) {
  const responseTime = response.timings.response;
  
  if (responseTime > 2000) {
    ee.emit('counter', 'slow_responses.over_2s', 1);
  } else if (responseTime > 1000) {
    ee.emit('counter', 'slow_responses.over_1s', 1);
  }
  
  ee.emit('histogram', 'response_time_ms', responseTime);
  
  return next();
}

/**
 * Simulates user behavior by assigning a random think time and user type to the context.
 *
 * Assigns a random delay between 500 ms and 3500 ms to `context.vars.thinkTime` and randomly selects a user type from 'casual', 'power_user', or 'browser', storing it in `context.vars.userType`.
 */
function simulateUserBehavior(requestParams, context, ee, next) {
  // Simuliere realistische Wartezeiten
  const thinkTime = Math.random() * 3000 + 500; // 0.5-3.5 Sekunden
  context.vars.thinkTime = thinkTime;
  
  // Simuliere verschiedene User-Typen
  const userTypes = ['casual', 'power_user', 'browser'];
  context.vars.userType = userTypes[Math.floor(Math.random() * userTypes.length)];
  
  return next();
}

/**
 * Emits a counter and logs a warning if the response time for a request exceeds a predefined performance threshold for the URL.
 *
 * @remark
 * If the URL is not explicitly listed in the thresholds, a default threshold of 2000 ms is used.
 */
function checkPerformanceThreshold(requestParams, response, context, ee, next) {
  const responseTime = response.timings.response;
  const url = requestParams.url;
  
  // Performance-Schwellenwerte definieren
  const thresholds = {
    '/': 1500,
    '/api/products': 1000,
    '/api/analytics': 800,
    '/dashboard': 2000
  };
  
  const threshold = thresholds[url] || 2000;
  
  if (responseTime > threshold) {
    ee.emit('counter', `performance.threshold_exceeded.${url.replace(/[^a-zA-Z0-9]/g, '_')}`, 1);
    console.warn(`Performance threshold exceeded for ${url}: ${responseTime}ms > ${threshold}ms`);
  }
  
  return next();
}

/**
 * Populates the context with randomized test data for checkout scenarios.
 *
 * Assigns the current timestamp, a random session ID, and a random request ID to the context. Generates a test cart item with a product ID (from the context or default '1'), a random quantity between 1 and 5, and a random price between 10.00 and 110.00.
 */
function generateTestData(requestParams, context, ee, next) {
  context.vars.timestamp = Date.now();
  context.vars.sessionId = Math.random().toString(36).substring(2, 15);
  context.vars.requestId = Math.random().toString(36).substring(2, 15);
  
  // Generiere Test-Checkout-Daten
  context.vars.testCartItem = {
    productId: context.vars.randomProductId || '1',
    quantity: Math.floor(Math.random() * 5) + 1,
    price: (Math.random() * 100 + 10).toFixed(2)
  };
  
  return next();
} 