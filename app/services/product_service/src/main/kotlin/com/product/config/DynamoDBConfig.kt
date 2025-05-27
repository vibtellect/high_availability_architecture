package com.product.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Profile
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.dynamodb.DynamoDbClient
import java.net.URI

@Configuration
class DynamoDBConfig {

    @Value("\${aws.region:eu-central-1}")
    private lateinit var awsRegion: String

    @Bean
    @Profile("!prod")
    fun dynamoDBClientLocal(
        @Value("\${aws.dynamodb.endpoint:http://localhost:4566}") endpoint: String
    ): DynamoDbClient {
        return DynamoDbClient.builder()
            .endpointOverride(URI.create(endpoint))
            .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create("dummy", "dummy")))
            .region(Region.of(awsRegion))
            .build()
    }


    @Bean
    @Profile("prod")
    fun dynamoDbClientProd(): DynamoDbClient {
        return DynamoDbClient.builder()
            .region(Region.of(awsRegion))
            .build()
    }

    @Bean
    fun dynamoDbEnhancedClient(dynamoDbClient: DynamoDbClient): DynamoDbEnhancedClient {
        return DynamoDbEnhancedClient.builder()
            .dynamoDbClient(dynamoDbClient)
            .build()
    }
}