package com.qwerty.usersync.security;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TokenUtil {
    // Simple in-memory token store (userId -> token)
    private final Map<Long, String> tokenStore = new ConcurrentHashMap<>();
    // Reverse mapping (token -> userId)
    private final Map<String, Long> userIdStore = new ConcurrentHashMap<>();

    public String generateToken(Long userId) {
        String token = UUID.randomUUID().toString();
        
        // Remove old token if exists
        String oldToken = tokenStore.get(userId);
        if (oldToken != null) {
            userIdStore.remove(oldToken);
        }
        
        tokenStore.put(userId, token);
        userIdStore.put(token, userId);
        
        return token;
    }

    public Long getUserIdFromToken(String token) {
        return userIdStore.get(token);
    }

    public boolean validateToken(String token) {
        return userIdStore.containsKey(token);
    }

    public void invalidateToken(String token) {
        Long userId = userIdStore.remove(token);
        if (userId != null) {
            tokenStore.remove(userId);
        }
    }
}
