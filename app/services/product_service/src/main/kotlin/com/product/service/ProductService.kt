package com.product.service

import com.product.model.Product
import com.product.repository.ProductRepository
import org.springframework.stereotype.Service
import java.time.Instant

@Service
class ProductService(private val productRepository: ProductRepository) {

    fun getAllProducts(): List<Product> {
        return productRepository.findAll()
    }

    fun getProductById(productId: String): Product? {
        return productRepository.findById(productId)
    }

    fun createProduct(product: Product): Product {
        product.createdAt = Instant.now()
        product.updatedAt = Instant.now()
        return productRepository.save(product)
    }

    fun updateProduct(productId: String, updatedProduct: Product): Product? {
        val existingProduct = productRepository.findById(productId) ?: return null
        
        updatedProduct.productId = productId
        updatedProduct.createdAt = existingProduct.createdAt
        updatedProduct.updatedAt = Instant.now()
        
        return productRepository.save(updatedProduct)
    }

    fun deleteProduct(productId: String): Boolean {
        if (!productRepository.existsById(productId)) {
            return false
        }
        productRepository.deleteById(productId)
        return true
    }
} 