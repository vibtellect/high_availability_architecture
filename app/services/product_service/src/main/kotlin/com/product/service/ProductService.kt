package com.product.service

import com.product.event.ProductEventPublisher
import com.product.model.Product
import com.product.repository.ProductRepository
import org.springframework.stereotype.Service
import java.time.Instant

@Service
class ProductService(
    private val productRepository: ProductRepository,
    private val eventPublisher: ProductEventPublisher
) {

    fun getAllProducts(): List<Product> {
        return productRepository.findAll()
    }

    fun getProductById(productId: String): Product? {
        return productRepository.findById(productId)
    }

    fun createProduct(product: Product): Product {
        product.createdAt = Instant.now()
        product.updatedAt = Instant.now()
        val savedProduct = productRepository.save(product)
        
        // Publish product created event
        eventPublisher.publishProductCreated(savedProduct)
        
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
        
        return savedProduct
    }

    fun deleteProduct(productId: String): Boolean {
        if (!productRepository.existsById(productId)) {
            return false
        }
        
        productRepository.deleteById(productId)
        
        // Publish product deleted event
        eventPublisher.publishProductDeleted(productId)
        
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
} 