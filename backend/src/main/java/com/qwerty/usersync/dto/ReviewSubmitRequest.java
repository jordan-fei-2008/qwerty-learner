package com.qwerty.usersync.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * DTO for submitting review session results.
 */
public class ReviewSubmitRequest {
    
    @NotNull(message = "Review items are required")
    @NotEmpty(message = "Review items cannot be empty")
    private List<ReviewItem> items;

    // Constructors
    public ReviewSubmitRequest() {}

    public ReviewSubmitRequest(List<ReviewItem> items) {
        this.items = items;
    }

    // Getters and Setters
    public List<ReviewItem> getItems() {
        return items;
    }

    public void setItems(List<ReviewItem> items) {
        this.items = items;
    }

    /**
     * Individual review item result.
     */
    public static class ReviewItem {
        @NotNull(message = "Word is required")
        private String word;
        
        @NotNull(message = "Correct flag is required")
        private Boolean correct;
        
        @Min(value = 0, message = "Mistakes must be non-negative")
        @Max(value = 100, message = "Mistakes must be less than 100")
        private Integer mistakes;
        
        @Min(value = 0, message = "Final familiarity must be at least 0")
        @Max(value = 10, message = "Final familiarity must be at most 10")
        private Integer finalFamiliarity;

        public ReviewItem() {}

        public ReviewItem(String word, Boolean correct, Integer mistakes, Integer finalFamiliarity) {
            this.word = word;
            this.correct = correct;
            this.mistakes = mistakes;
            this.finalFamiliarity = finalFamiliarity;
        }

        // Getters and Setters
        public String getWord() {
            return word;
        }

        public void setWord(String word) {
            this.word = word;
        }

        public Boolean getCorrect() {
            return correct;
        }

        public void setCorrect(Boolean correct) {
            this.correct = correct;
        }

        public Integer getMistakes() {
            return mistakes;
        }

        public void setMistakes(Integer mistakes) {
            this.mistakes = mistakes;
        }

        public Integer getFinalFamiliarity() {
            return finalFamiliarity;
        }

        public void setFinalFamiliarity(Integer finalFamiliarity) {
            this.finalFamiliarity = finalFamiliarity;
        }
    }
}
