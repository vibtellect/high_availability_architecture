package com.example.userservice.repository;

import com.example.userservice.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.ScanEnhancedRequest;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Repository
public class UserRepository {

    private final DynamoDbTable<User> userTable;

    @Autowired
    public UserRepository(DynamoDbEnhancedClient enhancedClient) {
        this.userTable = enhancedClient.table("Users", TableSchema.fromBean(User.class));
    }

    public User save(User user) {
        userTable.putItem(user);
        return user;
    }

    public Optional<User> findById(String userId) {
        Key key = Key.builder()
                .partitionValue(userId)
                .build();
        
        User user = userTable.getItem(key);
        return Optional.ofNullable(user);
    }

    public Optional<User> findByEmail(String email) {
        ScanEnhancedRequest scanRequest = ScanEnhancedRequest.builder()
                .filterExpression(software.amazon.awssdk.enhanced.dynamodb.Expression.builder()
                        .expression("email = :email")
                        .putExpressionValue(":email", AttributeValue.builder().s(email).build())
                        .build())
                .build();

        return userTable.scan(scanRequest)
                .items()
                .stream()
                .findFirst();
    }

    public Optional<User> findByUsername(String username) {
        ScanEnhancedRequest scanRequest = ScanEnhancedRequest.builder()
                .filterExpression(software.amazon.awssdk.enhanced.dynamodb.Expression.builder()
                        .expression("username = :username")
                        .putExpressionValue(":username", AttributeValue.builder().s(username).build())
                        .build())
                .build();

        return userTable.scan(scanRequest)
                .items()
                .stream()
                .findFirst();
    }

    public Optional<User> findByUsernameOrEmail(String usernameOrEmail) {
        ScanEnhancedRequest scanRequest = ScanEnhancedRequest.builder()
                .filterExpression(software.amazon.awssdk.enhanced.dynamodb.Expression.builder()
                        .expression("username = :value OR email = :value")
                        .putExpressionValue(":value", AttributeValue.builder().s(usernameOrEmail).build())
                        .build())
                .build();

        return userTable.scan(scanRequest)
                .items()
                .stream()
                .findFirst();
    }

    public List<User> findAll() {
        return userTable.scan()
                .items()
                .stream()
                .collect(Collectors.toList());
    }

    public List<User> findAllActive() {
        ScanEnhancedRequest scanRequest = ScanEnhancedRequest.builder()
                .filterExpression(software.amazon.awssdk.enhanced.dynamodb.Expression.builder()
                        .expression("active = :active")
                        .putExpressionValue(":active", AttributeValue.builder().bool(true).build())
                        .build())
                .build();

        return userTable.scan(scanRequest)
                .items()
                .stream()
                .collect(Collectors.toList());
    }

    public void deleteById(String userId) {
        Key key = Key.builder()
                .partitionValue(userId)
                .build();
        
        userTable.deleteItem(key);
    }

    public boolean existsByEmail(String email) {
        return findByEmail(email).isPresent();
    }

    public boolean existsByUsername(String username) {
        return findByUsername(username).isPresent();
    }
} 