package com.qwerty.usersync.dto;

import java.util.Map;

/**
 * DTO for word record storage (replacing IndexedDB)
 */
public class WordRecordRequest {
    private String word;
    private Long timeStamp;
    private String dict;
    private Integer chapter;
    private int[] timing;
    private Integer wrongCount;
    private Map<Integer, String[]> mistakes;

    public WordRecordRequest() {}

    public String getWord() {
        return word;
    }

    public void setWord(String word) {
        this.word = word;
    }

    public Long getTimeStamp() {
        return timeStamp;
    }

    public void setTimeStamp(Long timeStamp) {
        this.timeStamp = timeStamp;
    }

    public String getDict() {
        return dict;
    }

    public void setDict(String dict) {
        this.dict = dict;
    }

    public Integer getChapter() {
        return chapter;
    }

    public void setChapter(Integer chapter) {
        this.chapter = chapter;
    }

    public int[] getTiming() {
        return timing;
    }

    public void setTiming(int[] timing) {
        this.timing = timing;
    }

    public Integer getWrongCount() {
        return wrongCount;
    }

    public void setWrongCount(Integer wrongCount) {
        this.wrongCount = wrongCount;
    }

    public Map<Integer, String[]> getMistakes() {
        return mistakes;
    }

    public void setMistakes(Map<Integer, String[]> mistakes) {
        this.mistakes = mistakes;
    }
}
