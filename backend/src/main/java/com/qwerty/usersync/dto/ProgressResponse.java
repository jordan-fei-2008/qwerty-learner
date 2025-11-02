package com.qwerty.usersync.dto;

import java.util.Map;

public class ProgressResponse {
    private Integer schemaVersion;
    private Map<String, Object> progress;
    private String updatedAt;

    // Constructors
    public ProgressResponse() {}

    public ProgressResponse(Integer schemaVersion, Map<String, Object> progress, String updatedAt) {
        this.schemaVersion = schemaVersion;
        this.progress = progress;
        this.updatedAt = updatedAt;
    }

    // Getters and Setters
    public Integer getSchemaVersion() {
        return schemaVersion;
    }

    public void setSchemaVersion(Integer schemaVersion) {
        this.schemaVersion = schemaVersion;
    }

    public Map<String, Object> getProgress() {
        return progress;
    }

    public void setProgress(Map<String, Object> progress) {
        this.progress = progress;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
