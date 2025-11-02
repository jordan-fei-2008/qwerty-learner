package com.qwerty.usersync.model;

import java.time.LocalDateTime;

public class UserProgress {
    private Long userId;
    private Integer schemaVersion;
    private String progressJson;
    private LocalDateTime updatedAt;

    // Constructors
    public UserProgress() {}

    public UserProgress(Long userId, Integer schemaVersion, String progressJson, LocalDateTime updatedAt) {
        this.userId = userId;
        this.schemaVersion = schemaVersion;
        this.progressJson = progressJson;
        this.updatedAt = updatedAt;
    }

    // Getters and Setters
    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Integer getSchemaVersion() {
        return schemaVersion;
    }

    public void setSchemaVersion(Integer schemaVersion) {
        this.schemaVersion = schemaVersion;
    }

    public String getProgressJson() {
        return progressJson;
    }

    public void setProgressJson(String progressJson) {
        this.progressJson = progressJson;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
