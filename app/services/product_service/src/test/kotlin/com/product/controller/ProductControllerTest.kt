package com.product.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.product.TestBase
import com.product.model.Product
import com.product.repository.ProductRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient
import software.amazon.awssdk.enhanced.dynamodb.TableSchema
import software.amazon.awssdk.enhanced.dynamodb.model.CreateTableEnhancedRequest

@SpringBootTest
@AutoConfigureWebMvc
class ProductControllerTest : TestBase() {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var productRepository: ProductRepository

    @Autowired
    private lateinit var dynamoDbEnhancedClient: DynamoDbEnhancedClient

    @BeforeEach
    fun setUp() {
        // Tabelle erstellen
        val table = dynamoDbEnhancedClient.table("Products", TableSchema.fromBean(Product::class.java))
        try {
            table.createTable(
                CreateTableEnhancedRequest.builder()
                    .provisionedThroughput { it.readCapacityUnits(5).writeCapacityUnits(5) }
                    .build()
            )
        } catch (e: Exception) {
            // Tabelle existiert bereits
        }
    }

    @Test
    fun `should create product`() {
        val product = Product(
            name = "New Product",
            description = "A new product",
            price = 49.99,
            inventoryCount = 50,
            category = "Electronics"
        )

        mockMvc.perform(
            post("/api/v1/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(product))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.name").value("New Product"))
            .andExpect(jsonPath("$.price").value(49.99))
    }

    @Test
    fun `should get all products`() {
        // Given
        val product1 = Product(name = "Product 1", price = 10.0, category = "Test")
        val product2 = Product(name = "Product 2", price = 20.0, category = "Test")
        productRepository.save(product1)
        productRepository.save(product2)

        // When & Then
        mockMvc.perform(get("/api/v1/products"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(2))
    }

    @Test
    fun `should get product by id`() {
        // Given
        val product = Product(name = "Test Product", price = 25.0, category = "Test")
        val savedProduct = productRepository.save(product)

        // When & Then
        mockMvc.perform(get("/api/v1/products/${savedProduct.productId}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.name").value("Test Product"))
            .andExpect(jsonPath("$.productId").value(savedProduct.productId))
    }

    @Test
    fun `should return 404 for non-existent product`() {
        mockMvc.perform(get("/api/v1/products/non-existent-id"))
            .andExpect(status().isNotFound)
    }

    @Test
    fun `should search products`() {
        // Given
        val product1 = Product(name = "iPhone 15", description = "Latest iPhone", price = 999.0)
        val product2 = Product(name = "Samsung Galaxy", description = "Android phone", price = 799.0)
        val product3 = Product(name = "MacBook", description = "Apple laptop", price = 1299.0)
        
        productRepository.save(product1)
        productRepository.save(product2)
        productRepository.save(product3)

        // When & Then
        mockMvc.perform(get("/api/v1/products/search?query=phone"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(2))
    }
} 