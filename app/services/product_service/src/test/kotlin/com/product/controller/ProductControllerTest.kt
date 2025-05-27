package com.product.controller

import com.product.model.Product
import com.product.service.ProductService
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.Mockito.*
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.http.HttpStatus
import java.math.BigDecimal

@ExtendWith(MockitoExtension::class)
class ProductControllerTest {

    @Mock
    private lateinit var productService: ProductService

    @InjectMocks
    private lateinit var productController: ProductController

    @Test
    fun `should create product`() {
        // Given
        val product = Product(
            name = "New Product",
            description = "A new product",
            price = BigDecimal("49.99"),
            inventoryCount = 50,
            category = "Electronics"
        )
        val savedProduct = product.copy(productId = "test-id")
        
        `when`(productService.createProduct(product)).thenReturn(savedProduct)

        // When
        val response = productController.createProduct(product)

        // Then
        assert(response.statusCode == HttpStatus.CREATED)
        assert(response.body?.productId == "test-id")
        assert(response.body?.name == "New Product")
        verify(productService).createProduct(product)
    }

    @Test
    fun `should get all products`() {
        // Given
        val product1 = Product(productId = "1", name = "Product 1", price = BigDecimal("10.0"), category = "Test")
        val product2 = Product(productId = "2", name = "Product 2", price = BigDecimal("20.0"), category = "Test")
        val products = listOf(product1, product2)
        
        `when`(productService.getAllProducts()).thenReturn(products)

        // When
        val response = productController.getAllProducts()

        // Then
        assert(response.statusCode == HttpStatus.OK)
        assert(response.body?.size == 2)
        assert(response.body?.get(0)?.name == "Product 1")
        verify(productService).getAllProducts()
    }

    @Test
    fun `should get product by id`() {
        // Given
        val product = Product(productId = "test-id", name = "Test Product", price = BigDecimal("25.0"), category = "Test")
        
        `when`(productService.getProductById("test-id")).thenReturn(product)

        // When
        val response = productController.getProductById("test-id")

        // Then
        assert(response.statusCode == HttpStatus.OK)
        assert(response.body?.productId == "test-id")
        assert(response.body?.name == "Test Product")
        verify(productService).getProductById("test-id")
    }

    @Test
    fun `should return 404 for non-existent product`() {
        // Given
        `when`(productService.getProductById("non-existent")).thenReturn(null)

        // When
        val response = productController.getProductById("non-existent")

        // Then
        assert(response.statusCode == HttpStatus.NOT_FOUND)
        assert(response.body == null)
        verify(productService).getProductById("non-existent")
    }

    @Test
    fun `should update product`() {
        // Given
        val productId = "test-id"
        val updatedProduct = Product(
            name = "Updated Product",
            description = "Updated description",
            price = BigDecimal("59.99"),
            inventoryCount = 75,
            category = "Electronics"
        )
        val savedProduct = updatedProduct.copy(productId = productId)
        
        `when`(productService.updateProduct(productId, updatedProduct)).thenReturn(savedProduct)

        // When
        val response = productController.updateProduct(productId, updatedProduct)

        // Then
        assert(response.statusCode == HttpStatus.OK)
        assert(response.body?.productId == productId)
        assert(response.body?.name == "Updated Product")
        verify(productService).updateProduct(productId, updatedProduct)
    }

    @Test
    fun `should delete product`() {
        // Given
        `when`(productService.deleteProduct("test-id")).thenReturn(true)

        // When
        val response = productController.deleteProduct("test-id")

        // Then
        assert(response.statusCode == HttpStatus.NO_CONTENT)
        verify(productService).deleteProduct("test-id")
    }

    @Test
    fun `should return 404 when deleting non-existent product`() {
        // Given
        `when`(productService.deleteProduct("non-existent")).thenReturn(false)

        // When
        val response = productController.deleteProduct("non-existent")

        // Then
        assert(response.statusCode == HttpStatus.NOT_FOUND)
        verify(productService).deleteProduct("non-existent")
    }
} 