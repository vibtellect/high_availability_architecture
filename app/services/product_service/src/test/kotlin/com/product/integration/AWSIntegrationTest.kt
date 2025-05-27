package com.product.integration

import com.product.model.Product
import com.product.repository.ProductRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import java.math.BigDecimal

@SpringBootTest
@ActiveProfiles("aws")
@EnabledIfEnvironmentVariable(named = "AWS_INTEGRATION_TEST", matches = "true")
class AWSIntegrationTest {

    @Autowired
    private lateinit var productRepository: ProductRepository

    @Test
    fun `should work with real AWS DynamoDB`() {
        // Given
        val product = Product(
            name = "AWS Test Product",
            description = "Testing with real AWS",
            price = BigDecimal("99.99"),
            inventoryCount = 5,
            category = "Test"
        )

        // When
        val savedProduct = productRepository.save(product)
        val retrievedProduct = productRepository.findById(savedProduct.productId)

        // Then
        assertThat(retrievedProduct).isNotNull
        assertThat(retrievedProduct?.name).isEqualTo("AWS Test Product")

        // Cleanup
        productRepository.deleteById(savedProduct.productId)
    }
} 