package com.qwerty.usersync.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qwerty.usersync.dto.AuthResponse;
import com.qwerty.usersync.dto.RegisterRequest;
import com.qwerty.usersync.exception.EmailAlreadyExistsException;
import com.qwerty.usersync.exception.UsernameAlreadyExistsException;
import com.qwerty.usersync.model.User;
import com.qwerty.usersync.model.UserProgress;
import com.qwerty.usersync.progress.DefaultProgress;
import com.qwerty.usersync.repository.UserProgressRepository;
import com.qwerty.usersync.repository.UserRepository;
import com.qwerty.usersync.security.PasswordUtil;
import com.qwerty.usersync.security.SecurityAnswerUtil;
import com.qwerty.usersync.security.TokenUtil;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class RegistrationService {
    private final UserRepository userRepository;
    private final UserProgressRepository progressRepository;
    private final PasswordUtil passwordUtil;
    private final SecurityAnswerUtil securityAnswerUtil;
    private final TokenUtil tokenUtil;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RegistrationService(UserRepository userRepository,
                               UserProgressRepository progressRepository,
                               PasswordUtil passwordUtil,
                               SecurityAnswerUtil securityAnswerUtil,
                               TokenUtil tokenUtil) {
        this.userRepository = userRepository;
        this.progressRepository = progressRepository;
        this.passwordUtil = passwordUtil;
        this.securityAnswerUtil = securityAnswerUtil;
        this.tokenUtil = tokenUtil;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Validate username uniqueness
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new UsernameAlreadyExistsException("Username already exists");
        }

        // Validate email uniqueness if provided
        if (request.getEmail() != null && !request.getEmail().isEmpty()) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new EmailAlreadyExistsException("Email already exists");
            }
        }

        // Validate password length
        if (request.getPassword().length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters");
        }

        // Create user
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordUtil.hash(request.getPassword()));
        user.setSecurityQuestion(request.getSecurityQuestion());
        user.setSecurityAnswerHash(securityAnswerUtil.hash(request.getSecurityAnswer()));
        
        try {
            user = userRepository.save(user);
        } catch (DataAccessException e) {
            if (e.getCause() instanceof org.sqlite.SQLiteException) {
                String causeMessage = e.getCause().getMessage();
                if (causeMessage.contains("UNIQUE constraint failed: users.email")) {
                    throw new EmailAlreadyExistsException("Email already exists");
                }
                if (causeMessage.contains("UNIQUE constraint failed: users.username")) {
                    throw new UsernameAlreadyExistsException("Username already exists");
                }
            }
            throw e;
        }

        // Create default progress
        UserProgress progress = new UserProgress();
        progress.setUserId(user.getId());
        progress.setSchemaVersion(DefaultProgress.INITIAL_SCHEMA_VERSION);
        progress.setProgressJson(DefaultProgress.DEFAULT_PROGRESS_JSON);
        progressRepository.save(progress);

        // Generate token
        String token = tokenUtil.generateToken(user.getId());

        // Parse progress JSON to Map
        Map<String, Object> progressMap;
        try {
            progressMap = objectMapper.readValue(DefaultProgress.DEFAULT_PROGRESS_JSON, 
                new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse default progress", e);
        }

        // Return auth response
        AuthResponse.UserInfo userInfo = new AuthResponse.UserInfo(
            user.getUsername(),
            DefaultProgress.INITIAL_SCHEMA_VERSION,
            user.getLastLoginAt() != null ? user.getLastLoginAt().format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null
        );

        return new AuthResponse(token, userInfo, progressMap);
    }
}
