package com.example.userservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

import java.net.URI;

@Configuration
public class DynamoDbConfig {

    @Value("${aws.dynamodb.endpoint:}")
    private String dynamoDbEndpoint;

    @Value("${aws.region:us-east-1}")
    private String awsRegion;

    @Value("${aws.accessKeyId:test}")
    private String accessKeyId;

    @Value("${aws.secretKey:test}")
    private String secretKey;

    @Bean
    public DynamoDbClient dynamoDbClient() {
        var clientBuilder = DynamoDbClient.builder()
                .region(Region.of(awsRegion));

        // Configure for LocalStack if endpoint is provided
        if (dynamoDbEndpoint != null && !dynamoDbEndpoint.isEmpty()) {
            clientBuilder.endpointOverride(URI.create(dynamoDbEndpoint))
                    .credentialsProvider(StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(accessKeyId, secretKey)));
        } else {
            // Use default AWS credentials for production
            clientBuilder.credentialsProvider(DefaultCredentialsProvider.create());
        }

        return clientBuilder.build();
    }

    @Bean
    public DynamoDbEnhancedClient dynamoDbEnhancedClient(DynamoDbClient dynamoDbClient) {
        return DynamoDbEnhancedClient.builder()
                .dynamoDbClient(dynamoDbClient)
                .build();
    }
} 