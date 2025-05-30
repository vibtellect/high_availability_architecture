package com.product.controller

import com.product.model.Product
import com.product.service.ProductService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.math.BigDecimal

@RestController
@RequestMapping("/api/v1/products")
class ProductController(private val productService: ProductService) {

    @GetMapping
    fun getAllProducts(): ResponseEntity<List<Product>> {
        val products = productService.getAllProducts()
        return ResponseEntity.ok(products)
    }

    @GetMapping("/{productId}")
    fun getProductById(@PathVariable productId: String): ResponseEntity<Product> {
        val product = productService.getProductById(productId)
        return if (product != null) {
            ResponseEntity.ok(product)
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @PostMapping
    fun createProduct(@RequestBody product: Product): ResponseEntity<Product> {
        val createdProduct = productService.createProduct(product)
        return ResponseEntity.status(HttpStatus.CREATED).body(createdProduct)
    }

    @PutMapping("/{productId}")
    fun updateProduct(
        @PathVariable productId: String,
        @RequestBody product: Product
    ): ResponseEntity<Product> {
        val updatedProduct = productService.updateProduct(productId, product)
        return if (updatedProduct != null) {
            ResponseEntity.ok(updatedProduct)
        } else {
            ResponseEntity.notFound().build()
        }
    }

    @DeleteMapping("/{productId}")
    fun deleteProduct(@PathVariable productId: String): ResponseEntity<Void> {
        val deleted = productService.deleteProduct(productId)
        return if (deleted) {
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