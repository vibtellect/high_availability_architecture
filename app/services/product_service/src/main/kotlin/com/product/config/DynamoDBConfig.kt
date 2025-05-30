package com.product.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Profile
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.dynamodb.DynamoDbClient
import software.amazon.awssdk.services.sns.SnsClient
import java.net.URI

@Configuration
class AwsConfig {

    @Value("\${aws.region:eu-central-1}")
    private lateinit var awsRegion: String

    @Value("\${aws.accessKeyId:test}")
    private lateinit var accessKeyId: String

    @Value("\${aws.secretKey:test}")
    private lateinit var secretKey: String

    @Value("\${aws.dynamodb.endpoint:}")
    private lateinit var dynamoDbEndpoint: String

    @Value("\${aws.sns.endpoint:}")
    private lateinit var snsEndpoint: String

    @Bean
    @Profile("!prod")
    fun dynamoDBClientLocal(): DynamoDbClient {
        val endpoint = if (dynamoDbEndpoint.isNotEmpty()) dynamoDbEndpoint else "http://localhost:4566"
        return DynamoDbClient.builder()
            .endpointOverride(URI.create(endpoint))
            .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKeyId, secretKey)))
            .region(Region.of(awsRegion))
            .build()
    }

    @Bean
    @Profile("prod")
    fun dynamoDbClientProd(): DynamoDbClient {
        return DynamoDbClient.builder()
            .region(Region.of(awsRegion))
            .credentialsProvider(DefaultCredentialsProvider.create())
            .build()
    }

    @Bean
    fun dynamoDbEnhancedClient(dynamoDbClient: DynamoDbClient): DynamoDbEnhancedClient {
        return DynamoDbEnhancedClient.builder()
            .dynamoDbClient(dynamoDbClient)
            .build()
    }

    @Bean
    @Profile("!prod")
    fun snsClientLocal(): SnsClient {
        val endpoint = if (snsEndpoint.isNotEmpty()) snsEndpoint else "http://localhost:4566"
        return SnsClient.builder()
            .region(Region.of(awsRegion))
            .endpointOverride(URI.create(endpoint))
            .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKeyId, secretKey)))
            .build()
    }

    @Bean
    @Profile("prod")
    fun snsClientProd(): SnsClient {
        return SnsClient.builder()
            .region(Region.of(awsRegion))
            .credentialsProvider(DefaultCredentialsProvider.create())
            .build()
    }
}