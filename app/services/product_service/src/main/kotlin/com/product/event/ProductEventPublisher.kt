package com.product.event

import com.fasterxml.jackson.databind.ObjectMapper
import com.product.model.Product
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Service
import software.amazon.awssdk.services.sns.SnsClient
import software.amazon.awssdk.services.sns.model.MessageAttributeValue
import software.amazon.awssdk.services.sns.model.PublishRequest
import java.math.BigDecimal
import java.time.Instant

@Service
@ConditionalOnProperty(value = ["events.product.enabled"], havingValue = "true", matchIfMissing = true)
class ProductEventPublisher(
    private val snsClient: SnsClient,
    private val objectMapper: ObjectMapper
) {
    companion object {
        private val logger = LoggerFactory.getLogger(ProductEventPublisher::class.java)
    }

    @Value("\${aws.sns.product-topic-arn}")
    private lateinit var productTopicArn: String

    @Value("\${events.retry.max-attempts:3}")
    private var maxRetryAttempts: Int = 3

    private val lowInventoryThreshold = 10

    fun publishProductCreated(product: Product) {
        val event = ProductEvent(
            eventType = ProductEventType.PRODUCT_CREATED,
            productId = product.productId,
            data = mapOf(
                "name" to product.name,
                "description" to product.description,
                "price" to product.price.toString(),
                "inventoryCount" to product.inventoryCount,
                "category" to product.category,
                "createdAt" to product.createdAt.toString()
            )
        )
        publishEvent(event)

        // Check for low inventory on creation
        if (product.inventoryCount <= lowInventoryThreshold) {
            publishProductInventoryLow(product)
        }
    }

    fun publishProductUpdated(product: Product, oldProduct: Product? = null) {
        val event = ProductEvent(
            eventType = ProductEventType.PRODUCT_UPDATED,
            productId = product.productId,
            data = mapOf(
                "name" to product.name,
                "description" to product.description,
                "price" to product.price.toString(),
                "inventoryCount" to product.inventoryCount,
                "category" to product.category,
                "updatedAt" to product.updatedAt.toString()
            )
        )
        publishEvent(event)

        // Check for specific change events
        oldProduct?.let { old ->
            if (old.price != product.price) {
                publishProductPriceChanged(product, old.price, product.price)
            }
            if (old.category != product.category) {
                publishProductCategoryChanged(product, old.category, product.category)
            }
            if (old.inventoryCount > lowInventoryThreshold && product.inventoryCount <= lowInventoryThreshold) {
                publishProductInventoryLow(product)
            }
            if (old.inventoryCount <= lowInventoryThreshold && product.inventoryCount > lowInventoryThreshold) {
                publishProductInventoryRestocked(product)
            }
        }
    }

    fun publishProductDeleted(productId: String) {
        val event = ProductEvent(
            eventType = ProductEventType.PRODUCT_DELETED,
            productId = productId,
            data = mapOf(
                "deletedAt" to Instant.now().toString()
            )
        )
        publishEvent(event)
    }

    fun publishProductInventoryLow(product: Product) {
        val event = ProductEvent(
            eventType = ProductEventType.PRODUCT_INVENTORY_LOW,
            productId = product.productId,
            data = mapOf(
                "name" to product.name,
                "currentInventory" to product.inventoryCount,
                "threshold" to lowInventoryThreshold,
                "category" to product.category
            )
        )
        publishEvent(event)
    }

    fun publishProductInventoryRestocked(product: Product) {
        val event = ProductEvent(
            eventType = ProductEventType.PRODUCT_INVENTORY_RESTOCKED,
            productId = product.productId,
            data = mapOf(
                "name" to product.name,
                "currentInventory" to product.inventoryCount,
                "category" to product.category,
                "restockedAt" to Instant.now().toString()
            )
        )
        publishEvent(event)
    }

    fun publishProductPriceChanged(product: Product, oldPrice: BigDecimal, newPrice: BigDecimal) {
        val event = ProductEvent(
            eventType = ProductEventType.PRODUCT_PRICE_CHANGED,
            productId = product.productId,
            data = mapOf(
                "name" to product.name,
                "oldPrice" to oldPrice.toString(),
                "newPrice" to newPrice.toString(),
                "priceChange" to newPrice.subtract(oldPrice).toString(),
                "percentageChange" to if (oldPrice > BigDecimal.ZERO) {
                    newPrice.subtract(oldPrice).divide(oldPrice, 4, java.math.RoundingMode.HALF_UP)
                        .multiply(BigDecimal(100)).toString() + "%"
                } else "N/A",
                "category" to product.category
            )
        )
        publishEvent(event)
    }

    fun publishProductCategoryChanged(product: Product, oldCategory: String, newCategory: String) {
        val event = ProductEvent(
            eventType = ProductEventType.PRODUCT_CATEGORY_CHANGED,
            productId = product.productId,
            data = mapOf(
                "name" to product.name,
                "oldCategory" to oldCategory,
                "newCategory" to newCategory,
                "changedAt" to Instant.now().toString()
            )
        )
        publishEvent(event)
    }

    private fun publishEvent(event: ProductEvent) {
        var attempts = 0
        var lastException: Exception? = null

        while (attempts < maxRetryAttempts) {
            try {
                val messageBody = objectMapper.writeValueAsString(event)

                val request = PublishRequest.builder()
                    .topicArn(productTopicArn)
                    .message(messageBody)
                    .messageAttributes(
                        mapOf(
                            "eventType" to MessageAttributeValue.builder()
                                .dataType("String")
                                .stringValue(event.eventType.name)
                                .build(),
                            "productId" to MessageAttributeValue.builder()
                                .dataType("String")
                                .stringValue(event.productId)
                                .build(),
                            "eventId" to MessageAttributeValue.builder()
                                .dataType("String")
                                .stringValue(event.eventId)
                                .build()
                        )
                    )
                    .build()

                val response = snsClient.publish(request)
                logger.info(
                    "Published event {} for product {} with messageId: {}",
                    event.eventType, event.productId, response.messageId()
                )
                return // Success, exit retry loop

            } catch (e: Exception) {
                lastException = e
                attempts++
                logger.warn(
                    "Failed to publish event {} for product {} (attempt {}/{}): {}",
                    event.eventType, event.productId, attempts, maxRetryAttempts, e.message
                )

                if (attempts < maxRetryAttempts) {
                    try {
                        Thread.sleep(1000L * attempts) // Exponential backoff
                    } catch (ie: InterruptedException) {
                        Thread.currentThread().interrupt()
                        break
                    }
                }
            }
        }

        // All retries failed
        logger.error(
            "Failed to publish event {} for product {} after {} attempts",
            event.eventType, event.productId, maxRetryAttempts, lastException
        )

        // In production: consider sending to DLQ or alerting system
    }
} 