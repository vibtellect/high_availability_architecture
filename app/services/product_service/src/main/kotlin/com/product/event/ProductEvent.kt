package com.product.event

import com.fasterxml.jackson.annotation.JsonFormat
import java.time.Instant
import java.util.*

data class ProductEvent(
    val eventId: String = UUID.randomUUID().toString(),
    val eventType: ProductEventType,
    val productId: String,
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    val timestamp: Instant = Instant.now(),
    val data: Map<String, Any> = emptyMap()
) {
    // Default constructor for Jackson
    constructor() : this(
        eventId = UUID.randomUUID().toString(),
        eventType = ProductEventType.PRODUCT_CREATED,
        productId = "",
        timestamp = Instant.now(),
        data = emptyMap()
    )

    override fun toString(): String {
        return "ProductEvent(" +
                "eventId='$eventId', " +
                "eventType=$eventType, " +
                "productId='$productId', " +
                "timestamp=$timestamp, " +
                "data=$data" +
                ")"
    }
} 