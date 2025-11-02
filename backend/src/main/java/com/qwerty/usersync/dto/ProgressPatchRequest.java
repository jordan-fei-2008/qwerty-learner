package com.qwerty.usersync.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.util.List;
import java.util.Map;

/**
 * DTO for incremental progress patch updates.
 * Each field is optional - only provided fields will be merged.
 */
public class ProgressPatchRequest {
    
    @Min(value = 1, message = "Schema version must be at least 1")
    private Integer schemaVersion;
    
    // Words to add to masteredWords (union merge)
    private List<String> addMasteredWords;
    
    // Familiarity updates (max merge with clamping 0-10)
    private Map<String, Integer> familiarityUpdates;
    
    // Words to add to review queue (union merge)
    private List<String> addReviewQueue;
    
    // Words to remove from review queue (set difference)
    private List<String> removeReviewQueue;
    
    // Stats update (replace merge)
    private StatsUpdate stats;
    
    // Session pointer update (replace merge)
    private SessionPointer sessionPointer;

    // Constructors
    public ProgressPatchRequest() {}

    // Getters and Setters
    public Integer getSchemaVersion() {
        return schemaVersion;
    }

    public void setSchemaVersion(Integer schemaVersion) {
        this.schemaVersion = schemaVersion;
    }

    public List<String> getAddMasteredWords() {
        return addMasteredWords;
    }

    public void setAddMasteredWords(List<String> addMasteredWords) {
        this.addMasteredWords = addMasteredWords;
    }

    public Map<String, Integer> getFamiliarityUpdates() {
        return familiarityUpdates;
    }

    public void setFamiliarityUpdates(Map<String, Integer> familiarityUpdates) {
        this.familiarityUpdates = familiarityUpdates;
    }

    public List<String> getAddReviewQueue() {
        return addReviewQueue;
    }

    public void setAddReviewQueue(List<String> addReviewQueue) {
        this.addReviewQueue = addReviewQueue;
    }

    public List<String> getRemoveReviewQueue() {
        return removeReviewQueue;
    }

    public void setRemoveReviewQueue(List<String> removeReviewQueue) {
        this.removeReviewQueue = removeReviewQueue;
    }

    public StatsUpdate getStats() {
        return stats;
    }

    public void setStats(StatsUpdate stats) {
        this.stats = stats;
    }

    public SessionPointer getSessionPointer() {
        return sessionPointer;
    }

    public void setSessionPointer(SessionPointer sessionPointer) {
        this.sessionPointer = sessionPointer;
    }

    // Nested classes for structured data
    public static class StatsUpdate {
        @Min(value = 0, message = "Total learned must be non-negative")
        private Integer totalLearned;
        
        @Min(value = 0, message = "Today learned must be non-negative")
        private Integer todayLearned;
        
        @Min(value = 0, message = "Streak days must be non-negative")
        private Integer streakDays;
        
        private String lastLearnedDate;

        public StatsUpdate() {}

        public Integer getTotalLearned() {
            return totalLearned;
        }

        public void setTotalLearned(Integer totalLearned) {
            this.totalLearned = totalLearned;
        }

        public Integer getTodayLearned() {
            return todayLearned;
        }

        public void setTodayLearned(Integer todayLearned) {
            this.todayLearned = todayLearned;
        }

        public Integer getStreakDays() {
            return streakDays;
        }

        public void setStreakDays(Integer streakDays) {
            this.streakDays = streakDays;
        }

        public String getLastLearnedDate() {
            return lastLearnedDate;
        }

        public void setLastLearnedDate(String lastLearnedDate) {
            this.lastLearnedDate = lastLearnedDate;
        }
    }

    public static class SessionPointer {
        private String wordsetId;
        
        @Min(value = 0, message = "Next index must be non-negative")
        private Integer nextIndex;

        public SessionPointer() {}

        public String getWordsetId() {
            return wordsetId;
        }

        public void setWordsetId(String wordsetId) {
            this.wordsetId = wordsetId;
        }

        public Integer getNextIndex() {
            return nextIndex;
        }

        public void setNextIndex(Integer nextIndex) {
            this.nextIndex = nextIndex;
        }
    }
}
