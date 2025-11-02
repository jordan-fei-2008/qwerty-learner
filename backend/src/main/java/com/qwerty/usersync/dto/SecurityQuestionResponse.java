package com.qwerty.usersync.dto;

public class SecurityQuestionResponse {
    private String username;
    private String securityQuestion;

    public SecurityQuestionResponse() {}

    public SecurityQuestionResponse(String username, String securityQuestion) {
        this.username = username;
        this.securityQuestion = securityQuestion;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getSecurityQuestion() {
        return securityQuestion;
    }

    public void setSecurityQuestion(String securityQuestion) {
        this.securityQuestion = securityQuestion;
    }
}
