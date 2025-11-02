package com.qwerty.usersync.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

@Component
public class ProgressValidator {
    private final ObjectMapper objectMapper = new ObjectMapper();

    public boolean isValid(String progressJson) {
        try {
            JsonNode node = objectMapper.readTree(progressJson);
            
            // Check mandatory keys
            if (!node.has("masteredWords") || !node.get("masteredWords").isArray()) {
                return false;
            }
            if (!node.has("familiarity") || !node.get("familiarity").isObject()) {
                return false;
            }
            if (!node.has("reviewQueue") || !node.get("reviewQueue").isArray()) {
                return false;
            }
            if (!node.has("stats") || !node.get("stats").isObject()) {
                return false;
            }
            if (!node.has("archived") || !node.get("archived").isArray()) {
                return false;
            }
            
            // sessionPointer is optional, but if present, must have correct structure
            if (node.has("sessionPointer") && !node.get("sessionPointer").isNull()) {
                JsonNode sessionPointer = node.get("sessionPointer");
                if (!sessionPointer.isObject()) {
                    return false;
                }
                if (!sessionPointer.has("wordset") || !sessionPointer.get("wordset").isTextual()) {
                    return false;
                }
                if (!sessionPointer.has("nextIndex") || !sessionPointer.get("nextIndex").isNumber()) {
                    return false;
                }
            }
            
            // Validate stats structure
            JsonNode stats = node.get("stats");
            return stats.has("totalLearned") && stats.has("todayLearned") && stats.has("streakDays");
            
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isValid(java.util.Map<String, Object> progressMap) {
        try {
            // Convert Map to JSON string and validate
            String progressJson = objectMapper.writeValueAsString(progressMap);
            return isValid(progressJson);
        } catch (Exception e) {
            return false;
        }
    }
}
