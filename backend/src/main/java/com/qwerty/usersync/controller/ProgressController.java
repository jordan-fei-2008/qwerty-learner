package com.qwerty.usersync.controller;

import com.qwerty.usersync.dto.ProgressPatchRequest;
import com.qwerty.usersync.dto.ProgressResponse;
import com.qwerty.usersync.dto.ProgressUpdateRequest;
import com.qwerty.usersync.dto.ReviewQueueResponse;
import com.qwerty.usersync.dto.ReviewSubmitRequest;
import com.qwerty.usersync.security.TokenUtil;
import com.qwerty.usersync.service.ProgressService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/progress")
public class ProgressController {

    private static final Logger log = LoggerFactory.getLogger(ProgressController.class);
    
    private final ProgressService progressService;
    private final TokenUtil tokenUtil;

    @Autowired
    public ProgressController(ProgressService progressService, TokenUtil tokenUtil) {
        this.progressService = progressService;
        this.tokenUtil = tokenUtil;
    }

    @GetMapping
    public ResponseEntity<?> getProgress(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractToken(authHeader);
            Long userId = tokenUtil.getUserIdFromToken(token);
            
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Invalid or expired token",
                    "status", HttpStatus.UNAUTHORIZED.value()
                ));
            }

            ProgressResponse response = progressService.getProgress(userId);
            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", e.getMessage(),
                "status", HttpStatus.NOT_FOUND.value()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to retrieve progress",
                "status", HttpStatus.INTERNAL_SERVER_ERROR.value()
            ));
        }
    }

    @PutMapping
    public ResponseEntity<?> updateProgress(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody ProgressUpdateRequest request) {
        try {
            String token = extractToken(authHeader);
            Long userId = tokenUtil.getUserIdFromToken(token);
            
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Invalid or expired token",
                    "status", HttpStatus.UNAUTHORIZED.value()
                ));
            }

            ProgressResponse response = progressService.updateProgress(userId, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", e.getMessage(),
                "status", HttpStatus.BAD_REQUEST.value()
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", e.getMessage(),
                "status", HttpStatus.NOT_FOUND.value()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to update progress",
                "status", HttpStatus.INTERNAL_SERVER_ERROR.value()
            ));
        }
    }

    /**
     * Incremental patch endpoint for progress updates.
     * Applies merge semantics: union for masteredWords/reviewQueue, max for familiarity, replace for stats/pointer.
     */
    @PostMapping("/patch")
    public ResponseEntity<?> patchProgress(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody ProgressPatchRequest patch) {
        try {
            String token = extractToken(authHeader);
            Long userId = tokenUtil.getUserIdFromToken(token);
            
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Invalid or expired token",
                    "status", HttpStatus.UNAUTHORIZED.value()
                ));
            }

            ProgressResponse response = progressService.patchProgress(userId, patch);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", e.getMessage(),
                "status", HttpStatus.BAD_REQUEST.value()
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", e.getMessage(),
                "status", HttpStatus.NOT_FOUND.value()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to patch progress",
                "status", HttpStatus.INTERNAL_SERVER_ERROR.value()
            ));
        }
    }

    /**
     * Get review queue with familiarity values.
     */
    @GetMapping("/review/queue")
    public ResponseEntity<?> getReviewQueue(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractToken(authHeader);
            Long userId = tokenUtil.getUserIdFromToken(token);
            
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Invalid or expired token",
                    "status", HttpStatus.UNAUTHORIZED.value()
                ));
            }

            ReviewQueueResponse response = progressService.getReviewQueue(userId);
            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", e.getMessage(),
                "status", HttpStatus.NOT_FOUND.value()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to retrieve review queue",
                "status", HttpStatus.INTERNAL_SERVER_ERROR.value()
            ));
        }
    }

    /**
     * Submit review session results.
     */
    @PostMapping("/review/submit")
    public ResponseEntity<?> submitReview(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody ReviewSubmitRequest reviewRequest) {
        try {
            String token = extractToken(authHeader);
            Long userId = tokenUtil.getUserIdFromToken(token);
            
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Invalid or expired token",
                    "status", HttpStatus.UNAUTHORIZED.value()
                ));
            }

            ProgressResponse response = progressService.submitReview(userId, reviewRequest);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", e.getMessage(),
                "status", HttpStatus.BAD_REQUEST.value()
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", e.getMessage(),
                "status", HttpStatus.NOT_FOUND.value()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to submit review",
                "status", HttpStatus.INTERNAL_SERVER_ERROR.value()
            ));
        }
    }

    /**
     * Add word record (replaces IndexedDB storage)
     */
    @PostMapping("/word-records")
    public ResponseEntity<?> addWordRecord(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> wordRecord) {
        try {
            String token = extractToken(authHeader);
            Long userId = tokenUtil.getUserIdFromToken(token);
            
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Invalid or expired token",
                    "status", HttpStatus.UNAUTHORIZED.value()
                ));
            }

            progressService.addWordRecord(userId, wordRecord);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to add word record",
                "status", HttpStatus.INTERNAL_SERVER_ERROR.value()
            ));
        }
    }

    /**
     * Get word records by time range (replaces IndexedDB query)
     */
    @GetMapping("/word-records")
    public ResponseEntity<?> getWordRecords(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime) {
        try {
            String token = extractToken(authHeader);
            Long userId = tokenUtil.getUserIdFromToken(token);
            
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "Invalid or expired token",
                    "status", HttpStatus.UNAUTHORIZED.value()
                ));
            }

            java.util.List<Map<String, Object>> records;
            if (startTime != null && endTime != null) {
                records = progressService.getWordRecords(userId, startTime, endTime);
            } else {
                records = progressService.getAllWordRecords(userId);
            }
            
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to get word records",
                "status", HttpStatus.INTERNAL_SERVER_ERROR.value()
            ));
        }
    }

    /**
     * Delete word records by word and dict
     * DELETE /api/progress/word-records?word={word}&dict={dict}
     */
    @DeleteMapping("/word-records")
    public ResponseEntity<?> deleteWordRecords(
        @RequestHeader("Authorization") String authHeader,
        @RequestParam String word,
        @RequestParam String dict
    ) {
        try {
            String token = extractToken(authHeader);
            Long userId = tokenUtil.getUserIdFromToken(token);
            
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid token"));
            }
            
            int deletedCount = progressService.deleteWordRecords(userId, word, dict);
            
            return ResponseEntity.ok(Map.of(
                "deletedCount", deletedCount,
                "message", "Records deleted successfully"
            ));
        } catch (Exception e) {
            log.error("Failed to delete word records - word: {}, dict: {}", word, dict, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "status", HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "error", "Failed to delete word records: " + e.getMessage()
            ));
        }
    }

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        throw new IllegalArgumentException("Invalid Authorization header");
    }
}
