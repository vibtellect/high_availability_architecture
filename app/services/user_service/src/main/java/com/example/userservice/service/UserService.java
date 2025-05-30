package com.example.userservice.service;

import com.example.userservice.dto.*;
import com.example.userservice.model.User;
import com.example.userservice.repository.UserRepository;
import com.example.userservice.util.JwtUtil;
import com.example.userservice.event.UserEventPublisher;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final UserEventPublisher eventPublisher;

    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil, UserEventPublisher eventPublisher) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.eventPublisher = eventPublisher;
    }

    public AuthResponse registerUser(UserRegistrationRequest request) {
        // Check if user already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }

        // Create new user
        User user = new User(
                request.getEmail(),
                request.getUsername(),
                passwordEncoder.encode(request.getPassword()),
                request.getFirstName(),
                request.getLastName()
        );
        
        // Generate unique user ID
        user.setUserId(UUID.randomUUID().toString());
        
        // Save user
        User savedUser = userRepository.save(user);
        
        // Publish event
        eventPublisher.publishUserRegistered(savedUser);
        
        // Generate JWT token
        String token = jwtUtil.generateToken(savedUser.getUsername());
        
        return new AuthResponse(token, new UserResponse(savedUser));
    }

    public AuthResponse authenticateUser(UserLoginRequest request) {
        // Find user by username or email
        Optional<User> userOptional = userRepository.findByUsernameOrEmail(request.getUsernameOrEmail());
        
        if (userOptional.isEmpty()) {
            throw new RuntimeException("Invalid credentials");
        }
        
        User user = userOptional.get();
        
        // Check if user is active
        if (!user.isActive()) {
            throw new RuntimeException("User account is deactivated");
        }
        
        // Verify password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Invalid credentials");
        }
        
        // Generate JWT token
        String token = jwtUtil.generateToken(user.getUsername());
        
        return new AuthResponse(token, new UserResponse(user));
    }

    public UserResponse getUserById(String userId) {
        Optional<User> userOptional = userRepository.findById(userId);
        
        if (userOptional.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        
        return new UserResponse(userOptional.get());
    }

    public UserResponse getUserByUsername(String username) {
        Optional<User> userOptional = userRepository.findByUsername(username);
        
        if (userOptional.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        
        return new UserResponse(userOptional.get());
    }

    public UserResponse getUserByEmail(String email) {
        Optional<User> userOptional = userRepository.findByEmail(email);
        
        if (userOptional.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        
        return new UserResponse(userOptional.get());
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(UserResponse::new)
                .collect(Collectors.toList());
    }

    public List<UserResponse> getAllActiveUsers() {
        return userRepository.findAllActive()
                .stream()
                .map(UserResponse::new)
                .collect(Collectors.toList());
    }

    public UserResponse updateUser(String userId, UserRegistrationRequest request) {
        Optional<User> userOptional = userRepository.findById(userId);
        
        if (userOptional.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        
        User user = userOptional.get();
        
        // Check if email is being changed and if it already exists
        if (!user.getEmail().equals(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        
        // Check if username is being changed and if it already exists
        if (!user.getUsername().equals(request.getUsername()) && userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        
        // Update user fields
        user.setEmail(request.getEmail());
        user.setUsername(request.getUsername());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        
        // Update password if provided
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        
        user.updateTimestamp();
        
        User updatedUser = userRepository.save(user);
        
        // Publish event
        eventPublisher.publishUserUpdated(updatedUser);
        
        return new UserResponse(updatedUser);
    }

    public void deactivateUser(String userId) {
        Optional<User> userOptional = userRepository.findById(userId);
        
        if (userOptional.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        
        User user = userOptional.get();
        user.setActive(false);
        user.updateTimestamp();
        
        userRepository.save(user);
        
        // Publish event
        eventPublisher.publishUserDeactivated(userId);
    }

    public void activateUser(String userId) {
        Optional<User> userOptional = userRepository.findById(userId);
        
        if (userOptional.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        
        User user = userOptional.get();
        user.setActive(true);
        user.updateTimestamp();
        
        userRepository.save(user);
    }

    public void deleteUser(String userId) {
        if (!userRepository.findById(userId).isPresent()) {
            throw new RuntimeException("User not found");
        }
        
        userRepository.deleteById(userId);
        
        // Publish event
        eventPublisher.publishUserDeleted(userId);
    }

    public boolean validateToken(String token) {
        return jwtUtil.validateToken(token);
    }

    public String extractUsernameFromToken(String token) {
        return jwtUtil.extractUsername(token);
    }
} 