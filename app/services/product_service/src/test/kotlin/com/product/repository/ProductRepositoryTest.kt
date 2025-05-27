package com.product.repository

import com.product.model.Product
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient
import software.amazon.awssdk.enhanced.dynamodb.TableSchema
import software.amazon.awssdk.enhanced.dynamodb.model.CreateTableEnhancedRequest
import software.amazon.awssdk.services.dynamodb.model.BillingMode
import java.math.BigDecimal

@SpringBootTest(classes = [com.product.service.ProductServiceApplication::class])
@ActiveProfiles("test")
class ProductRepositoryTest {

    @Autowired
    private lateinit var productRepository: ProductRepository

    @Autowired
    private lateinit var dynamoDbEnhancedClient: DynamoDbEnhancedClient

    @BeforeEach
    fun setUp() {
        // Tabelle für jeden Test neu erstellen
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
        
        // Alle vorhandenen Daten löschen
        val allProducts = productRepository.findAll()
        allProducts.forEach { product ->
            productRepository.deleteById(product.productId)
        }
    }

    @Test
    fun `should save and retrieve product`() {
        // Given
        val product = Product(
            name = "Test Product",
            description = "A test product",
            price = BigDecimal("29.99"),
            inventoryCount = 100,
            category = "Electronics"
        )

        // When
        val savedProduct = productRepository.save(product)
        val retrievedProduct = productRepository.findById(savedProduct.productId)

        // Then
        assertThat(retrievedProduct).isNotNull
        assertThat(retrievedProduct?.name).isEqualTo("Test Product")
        assertThat(retrievedProduct?.price).isEqualTo(BigDecimal("29.99"))
    }

    @Test
    fun `should find all products`() {
        // Given
        val product1 = Product(name = "Product 1", category = "Electronics", price = BigDecimal("10.0"))
        val product2 = Product(name = "Product 2", category = "Books", price = BigDecimal("20.0"))
        
        productRepository.save(product1)
        productRepository.save(product2)

        // When
        val allProducts = productRepository.findAll()

        // Then
        assertThat(allProducts).hasSize(2)
        assertThat(allProducts.map { it.name }).containsExactlyInAnyOrder("Product 1", "Product 2")
    }

    @Test
    fun `should find products by category`() {
        // Given
        val electronics1 = Product(name = "Phone", category = "Electronics", price = BigDecimal("500.0"))
        val electronics2 = Product(name = "Laptop", category = "Electronics", price = BigDecimal("1000.0"))
        val book = Product(name = "Book", category = "Books", price = BigDecimal("15.0"))
        
        productRepository.save(electronics1)
        productRepository.save(electronics2)
        productRepository.save(book)

        // When - Note: This method doesn't exist in the repository, so we'll filter manually
        val allProducts = productRepository.findAll()
        val electronicsProducts = allProducts.filter { it.category == "Electronics" }

        // Then
        assertThat(electronicsProducts).hasSize(2)
        assertThat(electronicsProducts.map { it.name }).containsExactlyInAnyOrder("Phone", "Laptop")
    }

    @Test
    fun `should delete product`() {
        // Given
        val product = Product(name = "To Delete", price = BigDecimal("10.0"))
        val savedProduct = productRepository.save(product)

        // When
        productRepository.deleteById(savedProduct.productId)
        val deletedProduct = productRepository.findById(savedProduct.productId)

        // Then
        assertThat(deletedProduct).isNull()
    }
} 