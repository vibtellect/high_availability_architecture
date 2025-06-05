package com.product.service

import com.product.event.ProductEventPublisher
import com.product.model.Product
import com.product.repository.ProductRepository
import org.springframework.stereotype.Service
import java.time.Instant

@Service
class ProductService(
    private val productRepository: ProductRepository,
    private val eventPublisher: ProductEventPublisher,
    private val externalServiceClient: ExternalServiceClient
) {

    fun getAllProducts(): List<Product> {
        val products = productRepository.findAll()
        
        // Send analytics event for product listing
        val analyticsEvent = mapOf(
            "event_type" to "product_view",
            "product_count" to products.size,
            "timestamp" to Instant.now().toString()
        )
        externalServiceClient.sendAnalyticsEvent(analyticsEvent)
        
        return products
    }

    fun getProductById(productId: String): Product? {
        val product = productRepository.findById(productId)
        
        // Send analytics event for product view
        if (product != null) {
            val analyticsEvent = mapOf(
                "event_type" to "product_view",
                "product_id" to productId,
                "product_name" to product.name,
                "timestamp" to Instant.now().toString()
            )
            externalServiceClient.sendAnalyticsEvent(analyticsEvent)
        }
        
        return product
    }

    fun createProduct(product: Product): Product {
        product.createdAt = Instant.now()
        product.updatedAt = Instant.now()
        val savedProduct = productRepository.save(product)
        
        // Publish product created event
        eventPublisher.publishProductCreated(savedProduct)
        
        // Send analytics event
        val analyticsEvent = mapOf(
            "event_type" to "custom",
            "custom_event" to "product_created",
            "product_id" to savedProduct.productId,
            "product_name" to savedProduct.name,
            "timestamp" to Instant.now().toString()
        )
        externalServiceClient.sendAnalyticsEvent(analyticsEvent)
        
        return savedProduct
    }

    fun updateProduct(productId: String, updatedProduct: Product): Product? {
        val existingProduct = productRepository.findById(productId) ?: return null
        
        updatedProduct.productId = productId
        updatedProduct.createdAt = existingProduct.createdAt
        updatedProduct.updatedAt = Instant.now()
        
        val savedProduct = productRepository.save(updatedProduct)
        
        // Publish product updated event with old product for comparison
        eventPublisher.publishProductUpdated(savedProduct, existingProduct)
        
        // Send analytics event
        val analyticsEvent = mapOf(
            "event_type" to "custom",
            "custom_event" to "product_updated",
            "product_id" to productId,
            "timestamp" to Instant.now().toString()
        )
        externalServiceClient.sendAnalyticsEvent(analyticsEvent)
        
        return savedProduct
    }

    fun deleteProduct(productId: String): Boolean {
        if (!productRepository.existsById(productId)) {
            return false
        }
        
        productRepository.deleteById(productId)
        
        // Publish product deleted event
        eventPublisher.publishProductDeleted(productId)
        
        // Send analytics event
        val analyticsEvent = mapOf(
            "event_type" to "custom",
            "custom_event" to "product_deleted",
            "product_id" to productId,
            "timestamp" to Instant.now().toString()
        )
        externalServiceClient.sendAnalyticsEvent(analyticsEvent)
        
        return true
    }

    /**
     * Update only the inventory count for a product (useful for stock management)
     */
    fun updateInventory(productId: String, newInventoryCount: Int): Product? {
        val existingProduct = productRepository.findById(productId) ?: return null
        val oldInventory = existingProduct.inventoryCount
        
        existingProduct.inventoryCount = newInventoryCount
        existingProduct.updatedAt = Instant.now()
        
        val savedProduct = productRepository.save(existingProduct)
        
        // Publish inventory-specific events based on threshold changes
        if (oldInventory > 10 && newInventoryCount <= 10) {
            eventPublisher.publishProductInventoryLow(savedProduct)
        } else if (oldInventory <= 10 && newInventoryCount > 10) {
            eventPublisher.publishProductInventoryRestocked(savedProduct)
        }
        
        // Also publish general update event
        eventPublisher.publishProductUpdated(savedProduct, existingProduct.copy(inventoryCount = oldInventory))
        
        return savedProduct
    }

    /**
     * Update only the price for a product
     */
    fun updatePrice(productId: String, newPrice: java.math.BigDecimal): Product? {
        val existingProduct = productRepository.findById(productId) ?: return null
        val oldPrice = existingProduct.price
        
        existingProduct.price = newPrice
        existingProduct.updatedAt = Instant.now()
        
        val savedProduct = productRepository.save(existingProduct)
        
        // Publish price change event
        eventPublisher.publishProductPriceChanged(savedProduct, oldPrice, newPrice)
        
        // Also publish general update event
        eventPublisher.publishProductUpdated(savedProduct, existingProduct.copy(price = oldPrice))
        
        return savedProduct
    }

    /**
     * Test method to validate user access
     */
    fun validateUserAccess(userId: String): Boolean {
        return externalServiceClient.validateUser(userId)
    }
} 