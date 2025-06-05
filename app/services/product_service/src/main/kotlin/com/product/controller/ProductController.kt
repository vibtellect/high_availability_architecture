package com.product.controller

import com.product.model.Product
import com.product.service.ProductService
import com.product.service.ExternalServiceClient
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import java.math.BigDecimal

@RestController
@RequestMapping("/api/v1/products")
class ProductController(
    private val productService: ProductService,
    private val externalServiceClient: ExternalServiceClient
) {

    private val logger: Logger = LoggerFactory.getLogger(ProductController::class.java)

    @GetMapping
    fun getAllProducts(): ResponseEntity<List<Product>> {
        val products = productService.getAllProducts()
        
        // Send analytics event (with circuit breaker)
        try {
            externalServiceClient.sendAnalyticsEvent(mapOf(
                "action" to "product_list_viewed",
                "timestamp" to System.currentTimeMillis(),
                "product_count" to products.size
            ))
        } catch (e: Exception) {
            logger.warn("Analytics event failed but continuing: ${e.message}")
        }
        
        return ResponseEntity.ok(products)
    }

    @GetMapping("/{productId}")
    fun getProductById(@PathVariable productId: String): ResponseEntity<Product> {
        val product = productService.getProductById(productId)
        
        if (product != null) {
            // Send analytics event for product view
            try {
                externalServiceClient.sendAnalyticsEvent(mapOf(
                    "action" to "product_viewed",
                    "product_id" to productId,
                    "timestamp" to System.currentTimeMillis()
                ))
            } catch (e: Exception) {
                logger.warn("Analytics event failed but continuing: ${e.message}")
            }
        }
        
        return if (product != null) {
            ResponseEntity.ok(product)
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PostMapping
    fun createProduct(
        @RequestBody product: Product,
        @RequestHeader(value = "X-User-ID", required = false) userId: String?
    ): ResponseEntity<Product> {
        
        // Validate user if user ID is provided (with circuit breaker)
        if (userId != null) {
            try {
                val isValidUser = externalServiceClient.validateUser(userId)
                if (!isValidUser) {
                    logger.warn("User validation failed for user: $userId")
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build()
                }
            } catch (e: Exception) {
                logger.warn("User validation failed but continuing: ${e.message}")
                // Continue with product creation (fallback already handled)
            }
        }
        
        val createdProduct = productService.createProduct(product)
        
        // Send analytics event
        try {
            externalServiceClient.sendAnalyticsEvent(mapOf(
                "action" to "product_created",
                "product_id" to createdProduct.productId,
                "user_id" to (userId ?: "anonymous"),
                "timestamp" to System.currentTimeMillis()
            ))
        } catch (e: Exception) {
            logger.warn("Analytics event failed but continuing: ${e.message}")
        }
        
        return ResponseEntity.status(HttpStatus.CREATED).body(createdProduct)
    }

    @PutMapping("/{productId}")
    fun updateProduct(
        @PathVariable productId: String,
        @RequestBody product: Product,
        @RequestHeader(value = "X-User-ID", required = false) userId: String?
    ): ResponseEntity<Product> {
        
        // Validate user if user ID is provided
        if (userId != null) {
            try {
                val isValidUser = externalServiceClient.validateUser(userId)
                if (!isValidUser) {
                    logger.warn("User validation failed for user: $userId")
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build()
                }
            } catch (e: Exception) {
                logger.warn("User validation failed but continuing: ${e.message}")
            }
        }
        
        val updatedProduct = productService.updateProduct(productId, product)
        return if (updatedProduct != null) {
            // Send analytics event
            try {
                externalServiceClient.sendAnalyticsEvent(mapOf(
                    "action" to "product_updated",
                    "product_id" to productId,
                    "user_id" to (userId ?: "anonymous"),
                    "timestamp" to System.currentTimeMillis()
                ))
            } catch (e: Exception) {
                logger.warn("Analytics event failed but continuing: ${e.message}")
            }
            
            ResponseEntity.ok(updatedProduct)
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @DeleteMapping("/{productId}")
    fun deleteProduct(
        @PathVariable productId: String,
        @RequestHeader(value = "X-User-ID", required = false) userId: String?
    ): ResponseEntity<Void> {
        
        // Validate user if user ID is provided
        if (userId != null) {
            try {
                val isValidUser = externalServiceClient.validateUser(userId)
                if (!isValidUser) {
                    logger.warn("User validation failed for user: $userId")
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).build()
                }
            } catch (e: Exception) {
                logger.warn("User validation failed but continuing: ${e.message}")
            }
        }
        
        val deleted = productService.deleteProduct(productId)
        return if (deleted) {
            // Send analytics event
            try {
                externalServiceClient.sendAnalyticsEvent(mapOf(
                    "action" to "product_deleted",
                    "product_id" to productId,
                    "user_id" to (userId ?: "anonymous"),
                    "timestamp" to System.currentTimeMillis()
                ))
            } catch (e: Exception) {
                logger.warn("Analytics event failed but continuing: ${e.message}")
            }
            
            ResponseEntity.noContent().build()
        } else {
            ResponseEntity.notFound().build()
        }
    }

    /**
     * Update only the inventory count for a product
     * POST /api/v1/products/{productId}/inventory
     */
    @PostMapping("/{productId}/inventory")
    fun updateInventory(
        @PathVariable productId: String,
        @RequestBody inventoryRequest: InventoryUpdateRequest
    ): ResponseEntity<Product> {
        val updatedProduct = productService.updateInventory(productId, inventoryRequest.inventoryCount)
        return if (updatedProduct != null) {
            ResponseEntity.ok(updatedProduct)
        } else {
            ResponseEntity.notFound().build()
        }
    }

    /**
     * Update only the price for a product
     * POST /api/v1/products/{productId}/price
     */
    @PostMapping("/{productId}/price")
    fun updatePrice(
        @PathVariable productId: String,
        @RequestBody priceRequest: PriceUpdateRequest
    ): ResponseEntity<Product> {
        val updatedProduct = productService.updatePrice(productId, priceRequest.price)
        return if (updatedProduct != null) {
            ResponseEntity.ok(updatedProduct)
        } else {
            ResponseEntity.notFound().build()
        }
    }

    /**
     * Get products with low inventory (inventory <= 10)
     */
    @GetMapping("/low-inventory")
    fun getProductsWithLowInventory(): ResponseEntity<List<Product>> {
        val allProducts = productService.getAllProducts()
        val lowInventoryProducts = allProducts.filter { it.inventoryCount <= 10 }
        return ResponseEntity.ok(lowInventoryProducts)
    }

    /**
     * Get products by category
     */
    @GetMapping("/category/{category}")
    fun getProductsByCategory(@PathVariable category: String): ResponseEntity<List<Product>> {
        val allProducts = productService.getAllProducts()
        val categoryProducts = allProducts.filter { 
            it.category.equals(category, ignoreCase = true) 
        }
        return ResponseEntity.ok(categoryProducts)
    }
}

/**
 * Request DTOs for specialized operations
 */
data class InventoryUpdateRequest(
    val inventoryCount: Int
)

data class PriceUpdateRequest(
    val price: BigDecimal
) 