package com.qwerty.usersync.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

public class ProgressUpdateRequest {
    @NotNull(message = "Schema version is required")
    private Integer schemaVersion;
    
    @NotNull(message = "Progress data is required")
    private Map<String, Object> progress;

    // Constructors
    public ProgressUpdateRequest() {}

    public ProgressUpdateRequest(Integer schemaVersion, Map<String, Object> progress) {
        this.schemaVersion = schemaVersion;
        this.progress = progress;
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
}
