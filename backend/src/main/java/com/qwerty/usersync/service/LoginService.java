package com.qwerty.usersync.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qwerty.usersync.dto.AuthResponse;
import com.qwerty.usersync.dto.LoginRequest;
import com.qwerty.usersync.model.User;
import com.qwerty.usersync.model.UserProgress;
import com.qwerty.usersync.repository.UserProgressRepository;
import com.qwerty.usersync.repository.UserRepository;
import com.qwerty.usersync.security.PasswordUtil;
import com.qwerty.usersync.security.TokenUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class LoginService {

    private final UserRepository userRepository;
    private final UserProgressRepository userProgressRepository;
    private final PasswordUtil passwordUtil;
    private final TokenUtil tokenUtil;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    public LoginService(UserRepository userRepository,
                       UserProgressRepository userProgressRepository,
                       PasswordUtil passwordUtil,
                       TokenUtil tokenUtil) {
        this.userRepository = userRepository;
        this.userProgressRepository = userProgressRepository;
        this.passwordUtil = passwordUtil;
        this.tokenUtil = tokenUtil;
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        // Find user by username
        User user = userRepository.findByUsername(request.getUsername())
            .orElseThrow(() -> new IllegalArgumentException("Invalid username or password"));

        // Verify password
        if (!passwordUtil.verify(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid username or password");
        }

        // Update last login timestamp
        userRepository.updateLastLoginAt(user.getId(), LocalDateTime.now());
        
        // Reload user to get updated lastLoginAt
        user = userRepository.findById(user.getId())
            .orElseThrow(() -> new IllegalStateException("User not found after update"));

        // Generate token
        String token = tokenUtil.generateToken(user.getId());

        // Save userId for lambda (effectively final)
        final Long userId = user.getId();

        // Load or create user progress
        UserProgress userProgress = userProgressRepository.findByUserId(userId)
            .orElseGet(() -> {
                // Create empty progress for new user
                UserProgress newProgress = new UserProgress();
                newProgress.setUserId(userId);
                newProgress.setSchemaVersion(1);
                
                // Initialize empty progress JSON
                Map<String, Object> emptyProgress = new java.util.HashMap<>();
                emptyProgress.put("masteredWords", new java.util.ArrayList<>());
                emptyProgress.put("familiarity", new java.util.HashMap<>());
                emptyProgress.put("reviewQueue", new java.util.ArrayList<>());
                
                Map<String, Object> stats = new java.util.HashMap<>();
                stats.put("totalLearned", 0);
                stats.put("todayLearned", 0);
                stats.put("streakDays", 0);
                stats.put("lastLearnedDate", null);
                emptyProgress.put("stats", stats);
                
                emptyProgress.put("sessionPointer", null);
                emptyProgress.put("archived", new java.util.ArrayList<>());
                
                try {
                    String progressJson = objectMapper.writeValueAsString(emptyProgress);
                    newProgress.setProgressJson(progressJson);
                } catch (Exception e) {
                    throw new RuntimeException("Failed to create initial progress JSON", e);
                }
                
                newProgress.setUpdatedAt(LocalDateTime.now());
                userProgressRepository.save(newProgress);
                return newProgress;
            });

        // Parse progress JSON to Map
        Map<String, Object> progressMap;
        try {
            progressMap = objectMapper.readValue(
                userProgress.getProgressJson(),
                new TypeReference<Map<String, Object>>() {}
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse progress JSON", e);
        }

        // Create response
        String lastLoginAtStr = user.getLastLoginAt() != null 
            ? user.getLastLoginAt().format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME) 
            : null;
            
        AuthResponse.UserInfo userInfo = new AuthResponse.UserInfo(
            user.getUsername(),
            userProgress.getSchemaVersion(),
            lastLoginAtStr
        );

        return new AuthResponse(token, userInfo, progressMap);
    }
}
