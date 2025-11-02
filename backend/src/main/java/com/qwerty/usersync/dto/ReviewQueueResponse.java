package com.qwerty.usersync.dto;

import java.util.List;
import java.util.Map;

/**
 * DTO for review queue response.
 */
public class ReviewQueueResponse {
    
    private List<String> reviewQueue;
    private Map<String, Integer> familiarity;

    // Constructors
    public ReviewQueueResponse() {}

    public ReviewQueueResponse(List<String> reviewQueue, Map<String, Integer> familiarity) {
        this.reviewQueue = reviewQueue;
        this.familiarity = familiarity;
    }

    // Getters and Setters
    public List<String> getReviewQueue() {
        return reviewQueue;
    }

    public void setReviewQueue(List<String> reviewQueue) {
        this.reviewQueue = reviewQueue;
    }

    public Map<String, Integer> getFamiliarity() {
        return familiarity;
    }

    public void setFamiliarity(Map<String, Integer> familiarity) {
        this.familiarity = familiarity;
    }
}
