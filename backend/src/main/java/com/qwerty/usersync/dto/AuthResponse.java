package com.qwerty.usersync.dto;

import java.time.LocalDateTime;
import java.util.Map;

public class AuthResponse {
    private String token;
    private UserInfo user;
    private Map<String, Object> progress;

    public AuthResponse(String token, UserInfo user, Map<String, Object> progress) {
        this.token = token;
        this.user = user;
        this.progress = progress;
    }

    // Getters and Setters
    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public UserInfo getUser() {
        return user;
    }

    public void setUser(UserInfo user) {
        this.user = user;
    }

    public Map<String, Object> getProgress() {
        return progress;
    }

    public void setProgress(Map<String, Object> progress) {
        this.progress = progress;
    }

    public static class UserInfo {
        private String username;
        private Integer schemaVersion;
        private String lastLoginAt;

        public UserInfo(String username, Integer schemaVersion, String lastLoginAt) {
            this.username = username;
            this.schemaVersion = schemaVersion;
            this.lastLoginAt = lastLoginAt;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public Integer getSchemaVersion() {
            return schemaVersion;
        }

        public void setSchemaVersion(Integer schemaVersion) {
            this.schemaVersion = schemaVersion;
        }

        public String getLastLoginAt() {
            return lastLoginAt;
        }

        public void setLastLoginAt(String lastLoginAt) {
            this.lastLoginAt = lastLoginAt;
        }
    }
}
