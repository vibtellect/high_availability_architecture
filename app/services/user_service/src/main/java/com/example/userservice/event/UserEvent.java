package com.example.userservice.event;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class UserEvent {
    private String eventId;
    private UserEventType eventType;
    private String userId;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant timestamp;

    private Map<String, Object> data;
// Default constructor for Jackson
public UserEvent() {
    this.eventId = UUID.randomUUID().toString();
    this.timestamp = Instant.now();
    this.eventType = null; // Consider adding UNKNOWN type
    this.userId = null;
    this.data = new HashMap<>();
    }

    public UserEvent(UserEventType eventType, String userId, Map<String, Object> data) {
        this();
        this.eventType = eventType;
        this.userId = userId;
        this.data = data;
    }

    // Getters and Setters
    public String getEventId() {
        return eventId;
    }
    
    public void setEventId(String eventId) {
        this.eventId = eventId;
    }

    public UserEventType getEventType() {
        return eventType;
    }

    public void setEventType(UserEventType eventType) {
        this.eventType = eventType;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public Instant getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }
    
    public Map<String, Object> getData() {
        return data;
    }

    public void setData(Map<String, Object> data) {
        this.data = data;
    }
    
    @Override
    public String toString() {
        return "UserEvent{" +
                "eventId='" + eventId + '\'' +
                ", eventType=" + eventType +
                ", userId='" + userId + '\'' +
                ", timestamp=" + timestamp +
                ", data=" + data +
                '}';
    }
}
