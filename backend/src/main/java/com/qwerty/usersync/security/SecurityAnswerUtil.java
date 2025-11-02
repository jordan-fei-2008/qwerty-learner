package com.qwerty.usersync.security;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class SecurityAnswerUtil {
    private static final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public String hash(String answer) {
        // Convert to lowercase for case-insensitive comparison
        return encoder.encode(answer.toLowerCase().trim());
    }

    public boolean verify(String plainAnswer, String hashedAnswer) {
        // Convert to lowercase for case-insensitive comparison
        return encoder.matches(plainAnswer.toLowerCase().trim(), hashedAnswer);
    }
}
