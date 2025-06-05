package com.product.service

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate
import org.springframework.http.ResponseEntity
import org.springframework.http.HttpStatus

@Service
class ExternalServiceClient(private val restTemplate: RestTemplate) {

    private val logger: Logger = LoggerFactory.getLogger(ExternalServiceClient::class.java)

    @Value("\${app.services.user-service.url:http://user-service:8081}")
    private lateinit var userServiceUrl: String

    @Value("\${app.services.analytics-service.url:http://analytics-service:8083}")
    private lateinit var analyticsServiceUrl: String

    @CircuitBreaker(name = "userService", fallbackMethod = "fallbackUserValidation")
    fun validateUser(userId: String): Boolean {
        logger.info("Validating user: {}", userId)
        try {
            val response: ResponseEntity<Map<String, Any>> = restTemplate.getForEntity(
                "$userServiceUrl/api/v1/users/$userId",
                Map::class.java as Class<Map<String, Any>>
            )
            
            logger.info("User validation response: {}", response.statusCode)
            return response.statusCode == HttpStatus.OK
        } catch (e: Exception) {
            logger.error("Error validating user $userId: ${e.message}")
            throw e
        }
    }

    @CircuitBreaker(name = "analyticsService", fallbackMethod = "fallbackAnalyticsEvent")
    fun sendAnalyticsEvent(event: Map<String, Any>): Boolean {
        logger.info("Sending analytics event: {}", event)
        try {
            val response: ResponseEntity<Map<String, Any>> = restTemplate.postForEntity(
                "$analyticsServiceUrl/api/v1/events",
                event,
                Map::class.java as Class<Map<String, Any>>
            )
            
            logger.info("Analytics event response: {}", response.statusCode)
            return response.statusCode.is2xxSuccessful
        } catch (e: Exception) {
            logger.error("Error sending analytics event: ${e.message}")
            throw e
        }
    }

    // Fallback methods
    fun fallbackUserValidation(userId: String, ex: Exception): Boolean {
        logger.warn("Circuit breaker fallback: User validation failed for user {}, reason: {}", userId, ex.message)
        // In fallback, we assume user is valid (optimistic fallback)
        // In production, this could check a cache or use a default policy
        return true
    }

    fun fallbackAnalyticsEvent(event: Map<String, Any>, ex: Exception): Boolean {
        logger.warn("Circuit breaker fallback: Analytics event failed, reason: {}", ex.message)
        // In fallback, we just log the event locally or store for retry
        logger.info("Fallback: Storing analytics event locally: {}", event)
        return false // Indicate that the event was not sent but handled
    }
} 