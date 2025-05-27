package com.product.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1")
class HelloController {
    
    @GetMapping("/hello")
    fun hello(): Map<String, String> {
        return mapOf(
            "message" to "Hello World from Product Service!",
            "service" to "product-service",
            "status" to "running",
            "timestamp" to java.time.Instant.now().toString()
        )
    }
    
    @GetMapping("/health")
    fun health(): Map<String, Any> {
        return mapOf(
            "status" to "UP",
            "service" to "product-service",
            "version" to "0.0.1-SNAPSHOT",
            "java_version" to System.getProperty("java.version"),
            "kotlin_version" to KotlinVersion.CURRENT.toString()
        )
    }
}