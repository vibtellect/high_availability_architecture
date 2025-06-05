/**
 * Artillery Test Data Generator
 * Generates realistic e-commerce user journey data using built-in JavaScript
 * No external dependencies required
 */

// Predefined product IDs that should exist in the system
const PRODUCT_IDS = [
    'prod-001', 'prod-002', 'prod-003', 'prod-004', 'prod-005',
    'prod-006', 'prod-007', 'prod-008', 'prod-009', 'prod-010'
];

// Realistic credit card data for testing
const CREDIT_CARDS = [
    { type: 'visa', number: '4111111111111111', cvv: '123' },
    { type: 'mastercard', number: '5555555555554444', cvv: '456' },
    { type: 'amex', number: '378282246310005', cvv: '7890' },
    { type: 'visa', number: '4012888888881881', cvv: '321' }
];

// Sample data arrays for realistic generation
const FIRST_NAMES = [
    'John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Maria',
    'James', 'Jennifer', 'William', 'Linda', 'Richard', 'Elizabeth', 'Joseph',
    'Barbara', 'Thomas', 'Susan', 'Christopher', 'Jessica', 'Daniel', 'Karen',
    'Paul', 'Nancy', 'Mark', 'Betty', 'Donald', 'Helen', 'George', 'Sandra'
];

const LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
    'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzales',
    'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
    'Ramirez', 'Lewis', 'Robinson'
];

const STREETS = [
    'Main Street', 'Oak Avenue', 'Elm Drive', 'Park Lane', 'Cedar Road',
    'Maple Avenue', 'Pine Street', 'Washington Ave', 'Lincoln Drive',
    'Roosevelt Street', 'Jefferson Road', 'Madison Avenue', 'Jackson Street',
    'Franklin Drive', 'Clinton Avenue', 'Spring Street', 'Church Road',
    'School Street', 'North Street', 'South Avenue'
];

const CITIES = [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
    'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
    'Fort Worth', 'Columbus', 'Indianapolis', 'Charlotte', 'San Francisco',
    'Seattle', 'Denver', 'Washington', 'Boston', 'Nashville', 'Baltimore',
    'Oklahoma City', 'Louisville', 'Portland', 'Las Vegas', 'Milwaukee'
];

const COUNTRIES = [
    'United States', 'Canada', 'Germany', 'France', 'United Kingdom',
    'Australia', 'Netherlands', 'Sweden', 'Norway', 'Denmark'
];

// Returning user pool for quick purchase scenarios
const RETURNING_USERS = [
    { email: 'john.doe@test.com', password: 'TestPass123!' },
    { email: 'jane.smith@test.com', password: 'TestPass123!' },
    { email: 'mike.johnson@test.com', password: 'TestPass123!' },
    { email: 'sarah.wilson@test.com', password: 'TestPass123!' },
    { email: 'david.brown@test.com', password: 'TestPass123!' }
];

// Utility functions for random generation
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function generateZipCode() {
    return String(randomInt(10000, 99999));
}

function generatePhoneNumber() {
    const area = randomInt(200, 999);
    const exchange = randomInt(200, 999);
    const number = randomInt(1000, 9999);
    return `${area}-${exchange}-${number}`;
}

function generateStreetAddress() {
    const number = randomInt(1, 9999);
    const street = randomChoice(STREETS);
    return `${number} ${street}`;
}

/**
 * Generate realistic user registration data
 */
function generateUserData(context, events, done) {
    const firstName = randomChoice(FIRST_NAMES);
    const lastName = randomChoice(LAST_NAMES);
    const timestamp = Date.now();
    
    context.vars.userEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${timestamp}@testuser.com`;
    context.vars.userPassword = 'TestPassword123!';
    context.vars.firstName = firstName;
    context.vars.lastName = lastName;
    context.vars.street = generateStreetAddress();
    context.vars.city = randomChoice(CITIES);
    context.vars.postalCode = generateZipCode();
    context.vars.country = randomChoice(COUNTRIES);
    
    // Generate phone for additional verification
    context.vars.phoneNumber = generatePhoneNumber();
    
    return done();
}

/**
 * Generate realistic payment data
 */
function generatePaymentData(context, events, done) {
    const card = randomChoice(CREDIT_CARDS);
    const currentYear = new Date().getFullYear();
    
    context.vars.paymentType = card.type;
    context.vars.cardNumber = card.number;
    context.vars.expiryMonth = String(randomInt(1, 12)).padStart(2, '0');
    context.vars.expiryYear = String(currentYear + randomInt(1, 5));
    context.vars.cvv = card.cvv;
    
    return done();
}

/**
 * Select a random product for browsing scenarios
 */
function selectRandomProduct(context, events, done) {
    const randomProduct = randomChoice(PRODUCT_IDS);
    context.vars.randomProductId = randomProduct;
    
    return done();
}

/**
 * Generate returning user data for quick purchase flows
 */
function generateReturningUserData(context, events, done) {
    const returningUser = randomChoice(RETURNING_USERS);
    
    context.vars.returningUserEmail = returningUser.email;
    context.vars.returningUserPassword = returningUser.password;
    
    return done();
}

/**
 * Generate saved payment method data for returning users
 */
function generateSavedPaymentData(context, events, done) {
    // Simulate saved payment method IDs
    const savedPaymentIds = ['payment-001', 'payment-002', 'payment-003'];
    context.vars.savedPaymentId = randomChoice(savedPaymentIds);
    
    return done();
}

/**
 * Generate search terms for product search scenarios
 */
function generateSearchData(context, events, done) {
    const searchTerms = [
        'laptop', 'smartphone', 'headphones', 'camera', 'watch',
        'shoes', 'jacket', 'book', 'coffee', 'tablet'
    ];
    
    context.vars.searchTerm = randomChoice(searchTerms);
    
    return done();
}

/**
 * Generate cart data with multiple items
 */
function generateCartData(context, events, done) {
    const numItems = randomInt(1, 3); // 1-3 items
    const selectedProducts = [];
    
    for (let i = 0; i < numItems; i++) {
        const productId = randomChoice(PRODUCT_IDS);
        const quantity = randomInt(1, 3); // 1-3 quantity
        
        selectedProducts.push({
            productId: productId,
            quantity: quantity
        });
    }
    
    context.vars.cartItems = selectedProducts;
    
    return done();
}

/**
 * Generate realistic user behavior timing
 */
function generateUserBehaviorTiming(context, events, done) {
    // Simulate realistic user behavior patterns
    const behaviorTypes = ['fast', 'normal', 'slow'];
    const behavior = randomChoice(behaviorTypes);
    
    let thinkTimes;
    switch (behavior) {
        case 'fast':
            thinkTimes = { browse: 1, read: 2, decide: 1 };
            break;
        case 'slow':
            thinkTimes = { browse: 5, read: 10, decide: 8 };
            break;
        default:
            thinkTimes = { browse: 3, read: 5, decide: 4 };
    }
    
    context.vars.browseTime = thinkTimes.browse;
    context.vars.readTime = thinkTimes.read;
    context.vars.decideTime = thinkTimes.decide;
    
    return done();
}

/**
 * Generate demographic data for user segmentation
 */
function generateDemographicData(context, events, done) {
    const ageGroups = ['18-25', '26-35', '36-45', '46-55', '55+'];
    const interests = ['technology', 'fashion', 'home', 'sports', 'books', 'travel'];
    
    context.vars.ageGroup = randomChoice(ageGroups);
    context.vars.interest = randomChoice(interests);
    context.vars.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return done();
}

/**
 * Log user journey step completion for analytics
 */
function logJourneyStep(stepName) {
    return function(context, events, done) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] User Journey Step: ${stepName} - Session: ${context.vars.sessionId || 'unknown'}`);
        
        // Track step timing
        if (!context.vars.journeyStartTime) {
            context.vars.journeyStartTime = Date.now();
        }
        
        context.vars.lastStepTime = Date.now();
        context.vars.journeyDuration = context.vars.lastStepTime - context.vars.journeyStartTime;
        
        return done();
    };
}

/**
 * Generate error scenarios for resilience testing
 */
function generateErrorScenarios(context, events, done) {
    const errorChance = Math.random();
    
    // 5% chance of simulating network issues
    if (errorChance < 0.05) {
        context.vars.simulateNetworkError = true;
        context.vars.errorType = 'network_timeout';
    }
    // 3% chance of simulating invalid data
    else if (errorChance < 0.08) {
        context.vars.simulateInvalidData = true;
        context.vars.errorType = 'invalid_data';
    }
    // 2% chance of simulating payment failures
    else if (errorChance < 0.10) {
        context.vars.simulatePaymentError = true;
        context.vars.errorType = 'payment_failure';
    }
    
    return done();
}

module.exports = {
    generateUserData,
    generatePaymentData,
    selectRandomProduct,
    generateReturningUserData,
    generateSavedPaymentData,
    generateSearchData,
    generateCartData,
    generateUserBehaviorTiming,
    generateDemographicData,
    logJourneyStep,
    generateErrorScenarios
}; 