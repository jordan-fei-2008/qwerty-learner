package com.qwerty.usersync.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.qwerty.usersync.dto.ProgressPatchRequest;
import com.qwerty.usersync.dto.ProgressResponse;
import com.qwerty.usersync.dto.ProgressUpdateRequest;
import com.qwerty.usersync.dto.ReviewQueueResponse;
import com.qwerty.usersync.dto.ReviewSubmitRequest;
import com.qwerty.usersync.model.UserProgress;
import com.qwerty.usersync.repository.UserProgressRepository;
import com.qwerty.usersync.validation.ProgressValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ProgressService {

    private static final Logger log = LoggerFactory.getLogger(ProgressService.class);
    
    private final UserProgressRepository progressRepository;
    private final ProgressValidator progressValidator;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    public ProgressService(UserProgressRepository progressRepository, ProgressValidator progressValidator) {
        this.progressRepository = progressRepository;
        this.progressValidator = progressValidator;
    }

    @Transactional
    public ProgressResponse updateProgress(Long userId, ProgressUpdateRequest request) {
        // Validate progress structure
        if (!progressValidator.isValid(request.getProgress())) {
            throw new IllegalArgumentException("Invalid progress data structure");
        }

        // Find existing progress
        UserProgress userProgress = progressRepository.findByUserId(userId)
            .orElseThrow(() -> new IllegalStateException("User progress not found"));

        // Convert progress map to JSON string
        String progressJson;
        try {
            progressJson = objectMapper.writeValueAsString(request.getProgress());
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize progress data", e);
        }

        // Update progress
        userProgress.setSchemaVersion(request.getSchemaVersion());
        userProgress.setProgressJson(progressJson);
        userProgress.setUpdatedAt(LocalDateTime.now());

        progressRepository.update(userProgress);

        // Return updated progress
        return new ProgressResponse(
            userProgress.getSchemaVersion(),
            request.getProgress(),
            userProgress.getUpdatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        );
    }

    public ProgressResponse getProgress(Long userId) {
        UserProgress userProgress = progressRepository.findByUserId(userId)
            .orElseThrow(() -> new IllegalStateException("User progress not found"));

        // Parse progress JSON to Map
        Map<String, Object> progressMap;
        try {
            progressMap = objectMapper.readValue(
                userProgress.getProgressJson(),
                new TypeReference<Map<String, Object>>() {}
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse progress JSON", e);
        }

        return new ProgressResponse(
            userProgress.getSchemaVersion(),
            progressMap,
            userProgress.getUpdatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        );
    }

    /**
     * Apply incremental patch to user progress.
     * Merge semantics:
     * - masteredWords: union (dedupe)
     * - familiarity: max with clamping [0, 10]
     * - reviewQueue: add union, then remove set difference
     * - stats: replace
     * - sessionPointer: replace
     */
    @Transactional
    public ProgressResponse patchProgress(Long userId, ProgressPatchRequest patch) {
        log.info("[PatchProgress] START - userId: {}", userId);
        log.debug("[PatchProgress] Patch data: {}", patch);
        
        // Find existing progress
        UserProgress userProgress = progressRepository.findByUserId(userId)
            .orElseThrow(() -> new IllegalStateException("User progress not found"));
        
        log.info("[PatchProgress] Found existing progress for user {}", userId);

        // Parse current progress
        Map<String, Object> currentProgress;
        try {
            currentProgress = objectMapper.readValue(
                userProgress.getProgressJson(),
                new TypeReference<Map<String, Object>>() {}
            );
            log.debug("[PatchProgress] Parsed current progress: {} keys", currentProgress.size());
        } catch (Exception e) {
            log.error("[PatchProgress] Failed to parse progress JSON", e);
            throw new RuntimeException("Failed to parse progress JSON", e);
        }

        // Apply patch merges
        applyPatchToProgress(currentProgress, patch);
        log.info("[PatchProgress] Applied patch merges");

        // Update schema version if provided
        if (patch.getSchemaVersion() != null) {
            userProgress.setSchemaVersion(patch.getSchemaVersion());
            log.debug("[PatchProgress] Updated schema version to {}", patch.getSchemaVersion());
        }

        // Serialize back to JSON
        String progressJson;
        try {
            progressJson = objectMapper.writeValueAsString(currentProgress);
            log.debug("[PatchProgress] Serialized progress JSON, length: {}", progressJson.length());
        } catch (Exception e) {
            log.error("[PatchProgress] Failed to serialize progress data", e);
            throw new RuntimeException("Failed to serialize progress data", e);
        }

        // Save updated progress
        userProgress.setProgressJson(progressJson);
        userProgress.setUpdatedAt(LocalDateTime.now());
        log.info("[PatchProgress] Calling repository.update() for user {}", userId);
        progressRepository.update(userProgress);
        log.info("[PatchProgress] Database update completed successfully");

        // Return merged progress
        ProgressResponse response = new ProgressResponse(
            userProgress.getSchemaVersion(),
            currentProgress,
            userProgress.getUpdatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        );
        log.info("[PatchProgress] END - returning response");
        return response;
    }

    /**
     * Submit review session results.
     * Processes review items and generates a patch update.
     */
    @Transactional
    public ProgressResponse submitReview(Long userId, ReviewSubmitRequest reviewRequest) {
        // Build patch from review results
        ProgressPatchRequest patch = buildReviewPatch(reviewRequest);
        
        // Apply patch using existing method
        return patchProgress(userId, patch);
    }

    /**
     * Get review queue with familiarity values.
     */
    public ReviewQueueResponse getReviewQueue(Long userId) {
        UserProgress userProgress = progressRepository.findByUserId(userId)
            .orElseThrow(() -> new IllegalStateException("User progress not found"));

        // Parse progress JSON
        Map<String, Object> progressMap;
        try {
            progressMap = objectMapper.readValue(
                userProgress.getProgressJson(),
                new TypeReference<Map<String, Object>>() {}
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse progress JSON", e);
        }

        // Extract review queue and familiarity
        @SuppressWarnings("unchecked")
        List<String> reviewQueue = (List<String>) progressMap.getOrDefault("reviewQueue", new ArrayList<>());
        
        @SuppressWarnings("unchecked")
        Map<String, Object> familiarityRaw = (Map<String, Object>) progressMap.getOrDefault("familiarity", new HashMap<>());
        
        // Convert familiarity values to integers and filter for review queue words
        Map<String, Integer> familiarity = new HashMap<>();
        for (String word : reviewQueue) {
            Object value = familiarityRaw.get(word);
            if (value != null) {
                familiarity.put(word, convertToInteger(value));
            }
        }

        return new ReviewQueueResponse(reviewQueue, familiarity);
    }

    // ===== Private Helper Methods =====

    /**
     * Apply patch to current progress map (mutates in place).
     */
    @SuppressWarnings("unchecked")
    private void applyPatchToProgress(Map<String, Object> current, ProgressPatchRequest patch) {
        // 1. Merge masteredWords (union with deduplication)
        if (patch.getAddMasteredWords() != null && !patch.getAddMasteredWords().isEmpty()) {
            List<String> currentMastered = (List<String>) current.getOrDefault("masteredWords", new ArrayList<>());
            Set<String> masteredSet = new HashSet<>(currentMastered);
            masteredSet.addAll(patch.getAddMasteredWords());
            current.put("masteredWords", new ArrayList<>(masteredSet));
        }

        // 2. Merge familiarity (max with clamping [0, 10])
        if (patch.getFamiliarityUpdates() != null && !patch.getFamiliarityUpdates().isEmpty()) {
            Map<String, Object> currentFamiliarity = (Map<String, Object>) current.getOrDefault("familiarity", new HashMap<>());
            
            for (Map.Entry<String, Integer> entry : patch.getFamiliarityUpdates().entrySet()) {
                String word = entry.getKey();
                int newValue = entry.getValue();
                
                // Get current value (default 0)
                int currentValue = 0;
                if (currentFamiliarity.containsKey(word)) {
                    currentValue = convertToInteger(currentFamiliarity.get(word));
                }
                
                // Take max and clamp [0, 10]
                int mergedValue = Math.max(currentValue, newValue);
                mergedValue = Math.max(0, Math.min(10, mergedValue));
                
                currentFamiliarity.put(word, mergedValue);
            }
            
            current.put("familiarity", currentFamiliarity);
        }

        // 3. Merge reviewQueue (add union, then remove set difference)
        List<String> currentQueue = (List<String>) current.getOrDefault("reviewQueue", new ArrayList<>());
        Set<String> queueSet = new HashSet<>(currentQueue);
        
        if (patch.getAddReviewQueue() != null && !patch.getAddReviewQueue().isEmpty()) {
            queueSet.addAll(patch.getAddReviewQueue());
        }
        
        if (patch.getRemoveReviewQueue() != null && !patch.getRemoveReviewQueue().isEmpty()) {
            queueSet.removeAll(patch.getRemoveReviewQueue());
        }
        
        // Enforce max capacity (1000)
        List<String> updatedQueue = new ArrayList<>(queueSet);
        if (updatedQueue.size() > 1000) {
            updatedQueue = updatedQueue.subList(0, 1000);
        }
        current.put("reviewQueue", updatedQueue);

        // 4. Update stats (replace merge)
        if (patch.getStats() != null) {
            Map<String, Object> currentStats = (Map<String, Object>) current.getOrDefault("stats", new HashMap<>());
            ProgressPatchRequest.StatsUpdate statsUpdate = patch.getStats();
            
            if (statsUpdate.getTotalLearned() != null) {
                currentStats.put("totalLearned", statsUpdate.getTotalLearned());
            }
            if (statsUpdate.getTodayLearned() != null) {
                currentStats.put("todayLearned", statsUpdate.getTodayLearned());
            }
            if (statsUpdate.getStreakDays() != null) {
                currentStats.put("streakDays", statsUpdate.getStreakDays());
            }
            if (statsUpdate.getLastLearnedDate() != null) {
                currentStats.put("lastLearnedDate", statsUpdate.getLastLearnedDate());
            }
            
            current.put("stats", currentStats);
        }

        // 5. Update sessionPointer (replace merge)
        if (patch.getSessionPointer() != null) {
            Map<String, Object> pointer = new HashMap<>();
            pointer.put("wordsetId", patch.getSessionPointer().getWordsetId());
            pointer.put("nextIndex", patch.getSessionPointer().getNextIndex());
            current.put("sessionPointer", pointer);
        }
    }

    /**
     * Build patch from review session results.
     */
    private ProgressPatchRequest buildReviewPatch(ReviewSubmitRequest reviewRequest) {
        ProgressPatchRequest patch = new ProgressPatchRequest();
        
        Map<String, Integer> familiarityUpdates = new HashMap<>();
        List<String> removeFromQueue = new ArrayList<>();
        
        for (ReviewSubmitRequest.ReviewItem item : reviewRequest.getItems()) {
            // Update familiarity
            familiarityUpdates.put(item.getWord(), item.getFinalFamiliarity());
            
            // Remove from queue if correct and familiarity >= 7
            if (item.getCorrect() && item.getFinalFamiliarity() >= 7) {
                removeFromQueue.add(item.getWord());
            }
        }
        
        patch.setFamiliarityUpdates(familiarityUpdates);
        patch.setRemoveReviewQueue(removeFromQueue);
        
        return patch;
    }

    /**
     * Helper method to convert Object to Integer safely
     */
    private int convertToInteger(Object value) {
        if (value instanceof Integer) {
            return (Integer) value;
        } else if (value instanceof Number) {
            return ((Number) value).intValue();
        } else if (value instanceof String) {
            try {
                return Integer.parseInt((String) value);
            } catch (NumberFormatException e) {
                return 0;
            }
        }
        return 0;
    }

    /**
     * Add word record to user progress (replaces IndexedDB storage)
     */
    @Transactional
    public void addWordRecord(Long userId, Map<String, Object> wordRecord) {
        log.info("[AddWordRecord] START - userId: {}", userId);
        
        UserProgress userProgress = progressRepository.findByUserId(userId)
            .orElseThrow(() -> new IllegalStateException("User progress not found"));

        try {
            // Parse current progress
            Map<String, Object> progress = objectMapper.readValue(
                userProgress.getProgressJson(),
                new TypeReference<Map<String, Object>>() {}
            );

            // Get or create wordRecords array
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> wordRecords = (List<Map<String, Object>>) progress.get("wordRecords");
            if (wordRecords == null) {
                wordRecords = new ArrayList<>();
                progress.put("wordRecords", wordRecords);
            }

            // Add new record
            wordRecords.add(wordRecord);
            log.debug("[AddWordRecord] Added word: {}, total records: {}", wordRecord.get("word"), wordRecords.size());

            // Save back
            String updatedJson = objectMapper.writeValueAsString(progress);
            userProgress.setProgressJson(updatedJson);
            userProgress.setUpdatedAt(LocalDateTime.now());
            progressRepository.update(userProgress);

            log.info("[AddWordRecord] END - Successfully added word record");
        } catch (Exception e) {
            log.error("[AddWordRecord] Failed to add word record", e);
            throw new RuntimeException("Failed to add word record", e);
        }
    }

    /**
     * Get word records within time range (replaces IndexedDB query)
     */
    public List<Map<String, Object>> getWordRecords(Long userId, Long startTime, Long endTime) {
        log.info("[GetWordRecords] START - userId: {}, range: {} - {}", userId, startTime, endTime);
        
        UserProgress userProgress = progressRepository.findByUserId(userId)
            .orElseThrow(() -> new IllegalStateException("User progress not found"));

        try {
            Map<String, Object> progress = objectMapper.readValue(
                userProgress.getProgressJson(),
                new TypeReference<Map<String, Object>>() {}
            );

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> wordRecords = (List<Map<String, Object>>) progress.get("wordRecords");
            
            if (wordRecords == null) {
                log.info("[GetWordRecords] No word records found");
                return new ArrayList<>();
            }

            // Filter by time range
            List<Map<String, Object>> filtered = wordRecords.stream()
                .filter(record -> {
                    Object timestamp = record.get("timeStamp");
                    if (timestamp instanceof Number) {
                        long ts = ((Number) timestamp).longValue();
                        return ts >= startTime && ts <= endTime;
                    }
                    return false;
                })
                .collect(Collectors.toList());

            log.info("[GetWordRecords] END - Returning {} records", filtered.size());
            return filtered;
        } catch (Exception e) {
            log.error("[GetWordRecords] Failed to get word records", e);
            return new ArrayList<>();
        }
    }

    /**
     * Get all word records (for migration/compatibility)
     */
    public List<Map<String, Object>> getAllWordRecords(Long userId) {
        log.info("[GetAllWordRecords] START - userId: {}", userId);
        
        UserProgress userProgress = progressRepository.findByUserId(userId)
            .orElseThrow(() -> new IllegalStateException("User progress not found"));

        try {
            Map<String, Object> progress = objectMapper.readValue(
                userProgress.getProgressJson(),
                new TypeReference<Map<String, Object>>() {}
            );

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> wordRecords = (List<Map<String, Object>>) progress.get("wordRecords");
            
            if (wordRecords == null) {
                wordRecords = new ArrayList<>();
            }

            log.info("[GetAllWordRecords] END - Returning {} records", wordRecords.size());
            return wordRecords;
        } catch (Exception e) {
            log.error("[GetAllWordRecords] Failed to get all word records", e);
            return new ArrayList<>();
        }
    }

    /**
     * Delete word records by word and dict
     * @param userId User ID
     * @param word Word to delete
     * @param dict Dictionary name
     * @return Number of records deleted
     */
    @Transactional
    public int deleteWordRecords(Long userId, String word, String dict) {
        log.info("[DeleteWordRecords] START - userId: {}, word: {}, dict: {}", userId, word, dict);
        
        try {
            UserProgress userProgress = progressRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("User progress not found for userId: " + userId));

            Map<String, Object> progress = objectMapper.readValue(
                userProgress.getProgressJson(),
                new TypeReference<Map<String, Object>>() {}
            );

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> wordRecords = (List<Map<String, Object>>) progress.get("wordRecords");
            
            if (wordRecords == null) {
                log.info("[DeleteWordRecords] No word records found in progress");
                return 0;
            }

            log.info("[DeleteWordRecords] Found {} total word records", wordRecords.size());

            // Remove all records matching word and dict
            int originalSize = wordRecords.size();
            wordRecords.removeIf(record -> {
                String recordWord = (String) record.get("word");
                String recordDict = (String) record.get("dict");
                boolean matches = word.equals(recordWord) && dict.equals(recordDict);
                if (matches) {
                    log.debug("[DeleteWordRecords] Removing record: word={}, dict={}", recordWord, recordDict);
                }
                return matches;
            });
            
            int deletedCount = originalSize - wordRecords.size();
            
            if (deletedCount > 0) {
                // Update progress in database
                progress.put("wordRecords", wordRecords);
                progress.put("updatedAt", System.currentTimeMillis());
                
                String updatedJson = objectMapper.writeValueAsString(progress);
                userProgress.setProgressJson(updatedJson);
                userProgress.setUpdatedAt(LocalDateTime.now());
                progressRepository.update(userProgress);
                
                log.info("[DeleteWordRecords] SUCCESS - Deleted {} records", deletedCount);
            } else {
                log.info("[DeleteWordRecords] No matching records found to delete");
            }
            
            return deletedCount;
        } catch (Exception e) {
            log.error("[DeleteWordRecords] FAILED - userId: {}, word: {}, dict: {}, error: {}", 
                userId, word, dict, e.getMessage(), e);
            throw new RuntimeException("Failed to delete word records: " + e.getMessage(), e);
        }
    }
}
