package com.product.model

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey
import java.math.BigDecimal
import java.time.Instant

@DynamoDbBean
class Product {
    private var productId: String = ""
    var name: String = ""
    var description: String = ""
    var price: BigDecimal = BigDecimal.ZERO
    var inventoryCount: Int = 0
    var category: String = ""
    var createdAt: Instant = Instant.now()
    var updatedAt: Instant = Instant.now()

    @DynamoDbPartitionKey
    fun getProductId(): String = productId
    
    fun setProductId(productId: String) {
        this.productId = productId
    }

    // Default constructor required by DynamoDB
    constructor()
    
    constructor(
        productId: String = "",
        name: String = "",
        description: String = "",
        price: BigDecimal = BigDecimal.ZERO,
        inventoryCount: Int = 0,
        category: String = "",
        createdAt: Instant = Instant.now(),
        updatedAt: Instant = Instant.now()
    ) {
        this.productId = productId
        this.name = name
        this.description = description
        this.price = price
        this.inventoryCount = inventoryCount
        this.category = category
        this.createdAt = createdAt
        this.updatedAt = updatedAt
    }
} 