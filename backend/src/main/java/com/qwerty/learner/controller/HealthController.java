package com.qwerty.learner.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Health check endpoint for monitoring service status.
 * 
 * T080: Health check endpoint
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    /**
     * GET /api/health
     * Returns service health status
     * 
     * Response: {"status": "UP", "timestamp": "2024-01-01T00:00:00Z"}
     */
    @GetMapping
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("timestamp", Instant.now().toString());
        
        return ResponseEntity.ok(response);
    }
}
