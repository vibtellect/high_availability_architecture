module.exports = {
  generateRandomProductId,
  validateResponse,
  logCustomMetric,
  simulateUserBehavior,
  checkPerformanceThreshold,
  generateTestData
};

function generateRandomProductId(requestParams, context, ee, next) {
  const productIds = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  context.vars.randomProductId = productIds[Math.floor(Math.random() * productIds.length)];
  return next();
}

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

function simulateUserBehavior(requestParams, context, ee, next) {
  // Simuliere realistische Wartezeiten
  const thinkTime = Math.random() * 3000 + 500; // 0.5-3.5 Sekunden
  context.vars.thinkTime = thinkTime;
  
  // Simuliere verschiedene User-Typen
  const userTypes = ['casual', 'power_user', 'browser'];
  context.vars.userType = userTypes[Math.floor(Math.random() * userTypes.length)];
  
  return next();
}

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