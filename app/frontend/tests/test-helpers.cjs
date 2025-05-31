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
    } catch (error) {
      ee.emit('counter', 'errors.invalid_json', 1);
    }
  }
  
  return next();
}

function logCustomMetric(requestParams, response, context, ee, next) {
  const responseTime = response.elapsedTime;
  
  if (responseTime > 1000) {
    ee.emit('counter', 'response_time.slow', 1);
  } else if (responseTime > 500) {
    ee.emit('counter', 'response_time.medium', 1);
  } else {
    ee.emit('counter', 'response_time.fast', 1);
  }
  
  // Custom histogram for response times
  ee.emit('histogram', 'custom.response_time', responseTime);
  
  return next();
}

function simulateUserBehavior(requestParams, context, ee, next) {
  // Simulate user think time between requests
  const thinkTime = Math.random() * 2000 + 500; // 500ms to 2.5s
  context.vars.thinkTime = thinkTime;
  
  // Simulate different user types
  const userTypes = ['casual', 'power', 'admin'];
  context.vars.userType = userTypes[Math.floor(Math.random() * userTypes.length)];
  
  // Vary request patterns based on user type
  switch (context.vars.userType) {
    case 'power':
      context.vars.requestsPerSession = Math.floor(Math.random() * 10) + 15; // 15-25 requests
      break;
    case 'admin':
      context.vars.requestsPerSession = Math.floor(Math.random() * 20) + 10; // 10-30 requests
      break;
    default: // casual
      context.vars.requestsPerSession = Math.floor(Math.random() * 5) + 3; // 3-8 requests
  }
  
  return next();
}

function checkPerformanceThreshold(requestParams, response, context, ee, next) {
  const responseTime = response.elapsedTime;
  const statusCode = response.statusCode;
  
  // Define performance thresholds
  const thresholds = {
    critical: 5000,   // 5 seconds
    warning: 2000,    // 2 seconds
    good: 1000        // 1 second
  };
  
  if (statusCode >= 500) {
    ee.emit('counter', 'errors.server_error', 1);
  } else if (statusCode >= 400) {
    ee.emit('counter', 'errors.client_error', 1);
  }
  
  if (responseTime > thresholds.critical) {
    ee.emit('counter', 'performance.critical', 1);
    console.warn(`Critical performance detected: ${responseTime}ms for ${requestParams.url}`);
  } else if (responseTime > thresholds.warning) {
    ee.emit('counter', 'performance.warning', 1);
  } else if (responseTime <= thresholds.good) {
    ee.emit('counter', 'performance.good', 1);
  }
  
  return next();
}

function generateTestData(requestParams, context, ee, next) {
  // Generate realistic test data
  const names = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Frank', 'Grace'];
  const surnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  const domains = ['example.com', 'test.org', 'demo.net', 'sample.io'];
  
  context.vars.testUser = {
    firstName: names[Math.floor(Math.random() * names.length)],
    lastName: surnames[Math.floor(Math.random() * surnames.length)],
    email: `user${Math.floor(Math.random() * 10000)}@${domains[Math.floor(Math.random() * domains.length)]}`,
    age: Math.floor(Math.random() * 50) + 18, // 18-68
    preferences: {
      category: ['electronics', 'clothing', 'books', 'home'][Math.floor(Math.random() * 4)],
      priceRange: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
    }
  };
  
  // Generate product search terms
  const searchTerms = [
    'laptop', 'smartphone', 'headphones', 'coffee', 'book', 
    'shirt', 'jeans', 'watch', 'camera', 'keyboard'
  ];
  context.vars.searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
  
  return next();
} 