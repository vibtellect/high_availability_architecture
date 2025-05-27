package com.product.controller

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.client.TestRestTemplate
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.http.HttpStatus
import org.assertj.core.api.Assertions.assertThat

@SpringBootTest(
    classes = [com.product.service.ProductServiceApplication::class],
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT
)
class HelloControllerTest {

    @LocalServerPort
    private var port: Int = 0

    private val restTemplate = TestRestTemplate()

    @Test
    fun `should return hello world message`() {
        val response = restTemplate.getForEntity(
            "http://localhost:$port/api/v1/hello",
            Map::class.java
        )
        
        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body?.get("message")).isEqualTo("Hello World from Product Service!")
        assertThat(response.body?.get("service")).isEqualTo("product-service")
        assertThat(response.body?.get("status")).isEqualTo("running")
    }

    @Test
    fun `should return health status`() {
        val response = restTemplate.getForEntity(
            "http://localhost:$port/api/v1/health",
            Map::class.java
        )
        
        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body?.get("status")).isEqualTo("UP")
        assertThat(response.body?.get("service")).isEqualTo("product-service")
    }
}