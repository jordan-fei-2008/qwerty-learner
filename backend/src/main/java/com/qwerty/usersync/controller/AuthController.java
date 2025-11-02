package com.qwerty.usersync.controller;

import com.qwerty.usersync.dto.AuthResponse;
import com.qwerty.usersync.dto.LoginRequest;
import com.qwerty.usersync.dto.RegisterRequest;
import com.qwerty.usersync.dto.SecurityQuestionRequest;
import com.qwerty.usersync.dto.SecurityQuestionResponse;
import com.qwerty.usersync.dto.ResetPasswordRequest;
import com.qwerty.usersync.service.LoginService;
import com.qwerty.usersync.service.RegistrationService;
import com.qwerty.usersync.service.PasswordResetService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final RegistrationService registrationService;
    private final LoginService loginService;
    private final PasswordResetService passwordResetService;

    @Autowired
    public AuthController(RegistrationService registrationService, 
                         LoginService loginService,
                         PasswordResetService passwordResetService) {
        this.registrationService = registrationService;
        this.loginService = loginService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            AuthResponse response = registrationService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            String message = e.getMessage();
            HttpStatus status;
            
            // Determine appropriate HTTP status code
            if (message.contains("already exists") || message.contains("already in use")) {
                status = HttpStatus.CONFLICT; // 409
            } else {
                status = HttpStatus.BAD_REQUEST; // 400
            }
            
            return ResponseEntity.status(status).body(Map.of(
                "error", message,
                "status", status.value()
            ));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse response = loginService.login(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "error", e.getMessage(),
                "status", HttpStatus.UNAUTHORIZED.value()
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", e.getMessage(),
                "status", HttpStatus.INTERNAL_SERVER_ERROR.value()
            ));
        }
    }

    @PostMapping("/security-question")
    public ResponseEntity<?> getSecurityQuestion(@Valid @RequestBody SecurityQuestionRequest request) {
        try {
            SecurityQuestionResponse response = passwordResetService.getSecurityQuestion(request.getUsername());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", e.getMessage(),
                "status", HttpStatus.NOT_FOUND.value()
            ));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            passwordResetService.resetPassword(
                request.getUsername(),
                request.getSecurityAnswer(),
                request.getNewPassword()
            );
            return ResponseEntity.ok(Map.of(
                "message", "Password reset successfully",
                "status", HttpStatus.OK.value()
            ));
        } catch (IllegalArgumentException e) {
            String message = e.getMessage();
            HttpStatus status;
            
            // Determine appropriate status code
            if (message.contains("not found")) {
                status = HttpStatus.NOT_FOUND; // 404
            } else if (message.contains("Incorrect")) {
                status = HttpStatus.UNAUTHORIZED; // 401
            } else {
                status = HttpStatus.BAD_REQUEST; // 400
            }
            
            return ResponseEntity.status(status).body(Map.of(
                "error", message,
                "status", status.value()
            ));
        }
    }
}
