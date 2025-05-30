package com.example.userservice.event;

import com.example.userservice.model.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.model.MessageAttributeValue;
import software.amazon.awssdk.services.sns.model.PublishRequest;

import java.time.Instant;
import java.util.Map;

@Service
@ConditionalOnProperty(value = "events.user.enabled", havingValue = "true", matchIfMissing = true)
public class UserEventPublisher {
    
    private static final Logger logger = LoggerFactory.getLogger(UserEventPublisher.class);
    
    private final SnsClient snsClient;
    private final ObjectMapper objectMapper;
    
    @Value("${aws.sns.user-topic-arn}")
    private String userTopicArn;
    
    @Value("${events.retry.max-attempts:3}")
    private int maxRetryAttempts;
    
    @Autowired
    public UserEventPublisher(SnsClient snsClient, ObjectMapper objectMapper) {
        this.snsClient = snsClient;
        this.objectMapper = objectMapper;
    }
    
    public void publishUserRegistered(User user) {
        UserEvent event = new UserEvent(
            UserEventType.USER_REGISTERED,
            user.getUserId(),
            Map.of(
                "email", user.getEmail(),
                "username", user.getUsername(),
                "firstName", user.getFirstName(),
                "lastName", user.getLastName(),
                "role", user.getRole(),
                "createdAt", user.getCreatedAt().toString()
            )
        );
        publishEvent(event);
    }
    
    public void publishUserUpdated(User user) {
        UserEvent event = new UserEvent(
            UserEventType.USER_UPDATED,
            user.getUserId(),
            Map.of(
                "email", user.getEmail(),
                "username", user.getUsername(),
                "firstName", user.getFirstName(),
                "lastName", user.getLastName(),
                "updatedAt", user.getUpdatedAt().toString()
            )
        );
        publishEvent(event);
    }
    
    public void publishUserActivated(String userId) {
        UserEvent event = new UserEvent(
            UserEventType.USER_ACTIVATED,
            userId,
            Map.of("reason", "manual_activation")
        );
        publishEvent(event);
    }
    
    public void publishUserDeactivated(String userId) {
        UserEvent event = new UserEvent(
            UserEventType.USER_DEACTIVATED,
            userId,
            Map.of("reason", "manual_deactivation")
        );
        publishEvent(event);
    }
    
    public void publishUserDeleted(String userId) {
        UserEvent event = new UserEvent(
            UserEventType.USER_DELETED,
            userId,
            Map.of("deletedAt", Instant.now().toString())
        );
        publishEvent(event);
    }
    
    public void publishUserLoginSuccess(String userId, String username) {
        UserEvent event = new UserEvent(
            UserEventType.USER_LOGIN_SUCCESS,
            userId,
            Map.of(
                "username", username,
                "loginTime", Instant.now().toString()
            )
        );
        publishEvent(event);
    }
    
    public void publishUserLoginFailed(String usernameOrEmail, String reason) {
        UserEvent event = new UserEvent(
            UserEventType.USER_LOGIN_FAILED,
            "unknown",
            Map.of(
                "usernameOrEmail", usernameOrEmail,
                "reason", reason,
                "attemptTime", Instant.now().toString()
            )
        );
        publishEvent(event);
    }
    
    private void publishEvent(UserEvent event) {
        int attempts = 0;
        Exception lastException = null;
        
        while (attempts < maxRetryAttempts) {
            try {
                String messageBody = objectMapper.writeValueAsString(event);
                
                PublishRequest request = PublishRequest.builder()
                    .topicArn(userTopicArn)
                    .message(messageBody)
                    .messageAttributes(Map.of(
                        "eventType", MessageAttributeValue.builder()
                            .dataType("String")
                            .stringValue(event.getEventType().name())
                            .build(),
                        "userId", MessageAttributeValue.builder()
                            .dataType("String")
                            .stringValue(event.getUserId())
                            .build(),
                        "eventId", MessageAttributeValue.builder()
                            .dataType("String")
                            .stringValue(event.getEventId())
                            .build()
                    ))
                    .build();
                
                var response = snsClient.publish(request);
                logger.info("Published event {} for user {} with messageId: {}", 
                    event.getEventType(), event.getUserId(), response.messageId());
                return; // Success, exit retry loop
                
            } catch (Exception e) {
                lastException = e;
                attempts++;
                logger.warn("Failed to publish event {} for user {} (attempt {}/{}): {}", 
                    event.getEventType(), event.getUserId(), attempts, maxRetryAttempts, e.getMessage());
                
                if (attempts < maxRetryAttempts) {
                    try {
                        Thread.sleep(1000 * attempts); // Exponential backoff
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        
        // All retries failed
        logger.error("Failed to publish event {} for user {} after {} attempts", 
            event.getEventType(), event.getUserId(), maxRetryAttempts, lastException);
        
        // In production: consider sending to DLQ or alerting system
    }
} 