package com.qwerty.usersync.service;

import com.qwerty.usersync.dto.SecurityQuestionResponse;
import com.qwerty.usersync.model.User;
import com.qwerty.usersync.repository.UserRepository;
import com.qwerty.usersync.security.PasswordUtil;
import com.qwerty.usersync.security.SecurityAnswerUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordResetService {
    private final UserRepository userRepository;
    private final SecurityAnswerUtil securityAnswerUtil;
    private final PasswordUtil passwordUtil;

    public PasswordResetService(
            UserRepository userRepository,
            SecurityAnswerUtil securityAnswerUtil,
            PasswordUtil passwordUtil) {
        this.userRepository = userRepository;
        this.securityAnswerUtil = securityAnswerUtil;
        this.passwordUtil = passwordUtil;
    }

    /**
     * Get security question for a user
     */
    public SecurityQuestionResponse getSecurityQuestion(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return new SecurityQuestionResponse(user.getUsername(), user.getSecurityQuestion());
    }

    /**
     * Reset password using security answer
     */
    @Transactional
    public void resetPassword(String username, String securityAnswer, String newPassword) {
        // Find user
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Verify security answer
        if (!securityAnswerUtil.verify(securityAnswer, user.getSecurityAnswerHash())) {
            throw new IllegalArgumentException("Incorrect security answer");
        }

        // Validate new password length
        if (newPassword.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters");
        }

        // Hash new password
        String newPasswordHash = passwordUtil.hash(newPassword);

        // Update password in database
        userRepository.updatePasswordHash(user.getId(), newPasswordHash);
    }
}
