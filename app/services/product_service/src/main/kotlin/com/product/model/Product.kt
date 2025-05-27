package com.product.model

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey
import java.math.BigDecimal
import java.time.Instant

@DynamoDbBean
data class Product(
    @get:DynamoDbPartitionKey
    var productId: String = "",
    var name: String = "",
    var description: String = "",
    var price: BigDecimal = BigDecimal.ZERO,
    var inventoryCount: Int = 0,
    var category: String = "",
    var createdAt: Instant = Instant.now(),
    var updatedAt: Instant = Instant.now()
) {
    // Default constructor required by DynamoDB
    constructor() : this("", "", "", BigDecimal.ZERO, 0, "", Instant.now(), Instant.now())
} 