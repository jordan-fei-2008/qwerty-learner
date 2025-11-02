package com.qwerty.usersync.dto;

import jakarta.validation.constraints.NotBlank;

public class SecurityQuestionRequest {
    @NotBlank(message = "Username is required")
    private String username;

    public SecurityQuestionRequest() {}

    public SecurityQuestionRequest(String username) {
        this.username = username;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }
}
