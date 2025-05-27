# Getting Started

## Product Service - Kotlin Spring Boot Application

This is a reactive Spring Boot application built with Kotlin, using WebFlux and DynamoDB.

## Prerequisites

- Java 21 (OpenJDK recommended)
- Gradle 8.13+ (included via wrapper)

## Project Structure

```
src/
├── main/kotlin/com/product/
│   ├── controller/          # REST controllers
│   └── service/            # Application main class
└── test/kotlin/com/product/
    └── controller/         # Controller tests
```

## How to Build and Run

### 1. Build the Application
```bash
./gradlew clean build
```

### 2. Run the Application
```bash
# Start the application (will show "85% EXECUTING" - this is normal!)
./gradlew bootRun

# Alternative: Build JAR and run
./gradlew bootJar
java -jar build/libs/product-service-0.0.1-SNAPSHOT.jar
```

### 3. Stop the Application
```bash
# If running in foreground: Ctrl+C
# If running in background:
pkill -f "product-service"
```

## Testing

### Run All Tests
```bash
./gradlew test
```

### Run Tests with Coverage
```bash
./gradlew test jacocoTestReport
```

### Run Specific Test Class
```bash
./gradlew test --tests "com.product.controller.HelloControllerTest"
```

### Run Tests in Continuous Mode
```bash
./gradlew test --continuous
```

### Test Reports
After running tests, view the HTML report at:
```
build/reports/tests/test/index.html
```

## Available Endpoints

### Application Endpoints
- `GET /api/v1/hello` - Returns service information with timestamp
- `GET /api/v1/health` - Returns detailed health status

### Spring Boot Actuator
- `GET /actuator/health` - Basic health check
- `GET /actuator` - Available actuator endpoints

## Testing the Endpoints

### Using curl
```bash
# Test hello endpoint
curl http://localhost:8080/api/v1/hello

# Test health endpoint  
curl http://localhost:8080/api/v1/health

# Test actuator health
curl http://localhost:8080/actuator/health
```

### Expected Responses

**Hello Endpoint:**
```json
{
  "message": "Hello World from Product Service!",
  "service": "product-service", 
  "status": "running",
  "timestamp": "2025-05-27T07:57:50.159519951Z"
}
```

**Health Endpoint:**
```json
{
  "status": "UP",
  "service": "product-service",
  "version": "0.0.1-SNAPSHOT",
  "java_version": "21.0.1",
  "kotlin_version": "2.0.0"
}
```

## Development Workflow

### 1. Make Code Changes
Edit files in `src/main/kotlin/`

### 2. Run Tests
```bash
./gradlew test
```

### 3. Start Application
```bash
./gradlew bootRun
```

### 4. Test Manually
```bash
curl http://localhost:8080/api/v1/hello
```

## Kotlin Testing Features

### Test Framework Stack
- **JUnit 5** - Testing framework
- **AssertJ** - Fluent assertions
- **Spring Boot Test** - Integration testing
- **TestRestTemplate** - HTTP client for tests
- **MockK** - Kotlin-friendly mocking (via springmockk)

### Writing Tests
```kotlin
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class MyControllerTest {
    
    @LocalServerPort
    private var port: Int = 0
    
    private val restTemplate = TestRestTemplate()
    
    @Test
    fun `should return expected response`() {
        val response = restTemplate.getForEntity(
            "http://localhost:$port/api/v1/endpoint",
            Map::class.java
        )
        
        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body?.get("key")).isEqualTo("expected_value")
    }
}
```

## Troubleshooting

### Common Issues

**"85% EXECUTING" Message:**
- This is normal for `bootRun` - it means the app is running
- The application is ready when you see "Netty started on port 8080"

**Tests Failing:**
- Ensure endpoints match test expectations
- Check that the application context loads properly
- Verify port conflicts (tests use random ports)

**Build Issues:**
- Run `./gradlew clean` to clear build cache
- Check Java version: `java -version`
- Stop Gradle daemons: `./gradlew --stop`

### Gradle Commands Reference
```bash
./gradlew tasks              # List all available tasks
./gradlew build             # Full build with tests
./gradlew assemble          # Build without tests  
./gradlew check             # Run all checks including tests
./gradlew clean             # Clean build directory
./gradlew --stop            # Stop Gradle daemons
./gradlew --status          # Show Gradle daemon status
```

## Reference Documentation

### Spring Boot & Kotlin
* [Spring Boot with Kotlin](https://spring.io/guides/tutorials/spring-boot-kotlin/)
* [Building web applications with Spring Boot and Kotlin](https://spring.io/guides/tutorials/spring-webflux-kotlin-rsocket/)
* [Spring Boot Testing](https://spring.io/guides/gs/testing-web/)

### Testing
* [JUnit 5 User Guide](https://junit.org/junit5/docs/current/user-guide/)
* [AssertJ Documentation](https://assertj.github.io/doc/)
* [Spring Boot Test Documentation](https://docs.spring.io/spring-boot/docs/current/reference/html/spring-boot-features.html#boot-features-testing)

### Gradle
* [Official Gradle documentation](https://docs.gradle.org)
* [Spring Boot Gradle Plugin Reference Guide](https://docs.spring.io/spring-boot/3.5.0/gradle-plugin)

