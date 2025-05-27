package com.product.repository

import com.product.model.Product
import org.springframework.stereotype.Repository
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable
import software.amazon.awssdk.enhanced.dynamodb.TableSchema
import software.amazon.awssdk.enhanced.dynamodb.model.ScanEnhancedRequest
import java.util.*

@Repository
class ProductRepository(private val dynamoDbEnhancedClient: DynamoDbEnhancedClient) {

    private val table: DynamoDbTable<Product> = dynamoDbEnhancedClient.table("Products", TableSchema.fromBean(Product::class.java))

    fun findAll(): List<Product> {
        return table.scan(ScanEnhancedRequest.builder().build())
            .items()
            .toList()
    }

    fun findById(productId: String): Product? {
        return table.getItem { it.key { k -> k.partitionValue(productId) } }
    }

    fun save(product: Product): Product {
        if (product.getProductId().isEmpty()) {
            product.setProductId(UUID.randomUUID().toString())
        }
        table.putItem(product)
        return product
    }

    fun deleteById(productId: String) {
        table.deleteItem { it.key { k -> k.partitionValue(productId) } }
    }

    fun existsById(productId: String): Boolean {
        return findById(productId) != null
    }
}