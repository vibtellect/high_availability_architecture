package com.product

import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.localstack.LocalStackContainer
import org.testcontainers.containers.localstack.LocalStackContainer.Service
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.utility.DockerImageName

@ActiveProfiles("test")
@Testcontainers
abstract class TestBase {

    companion object {
        @Container
        @JvmStatic
        val localstack: LocalStackContainer = LocalStackContainer(
            DockerImageName.parse("localstack/localstack:3.0")
        ).withServices(Service.DYNAMODB)

        @DynamicPropertySource
        @JvmStatic
        fun configureProperties(registry: DynamicPropertyRegistry) {
            registry.add("aws.dynamodb.endpoint") { localstack.getEndpointOverride(Service.DYNAMODB) }
            registry.add("aws.region") { localstack.region }
        }
    }
} 