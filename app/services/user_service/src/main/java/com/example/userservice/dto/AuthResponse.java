package com.example.userservice.dto;

public class AuthResponse {
    
    private String token;
    private String tokenType = "Bearer";
    private UserResponse user;
    
    // Default constructor
    public AuthResponse() {}
    
    public AuthResponse(String token, UserResponse user) {
        this.token = token;
        this.user = user;
    }
    
    public String getToken() {
        return token;
    }
    
    public void setToken(String token) {
        this.token = token;
    }
    
    public String getTokenType() {
        return tokenType;
    }
    
    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }
    
    public UserResponse getUser() {
        return user;
    }
    
    public void setUser(UserResponse user) {
        this.user = user;
    }
} 