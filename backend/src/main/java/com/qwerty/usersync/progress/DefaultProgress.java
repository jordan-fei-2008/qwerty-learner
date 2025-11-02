package com.qwerty.usersync.progress;

public class DefaultProgress {
    public static final String DEFAULT_PROGRESS_JSON = """
        {
          "masteredWords": [],
          "familiarity": {},
          "reviewQueue": [],
          "stats": {
            "totalLearned": 0,
            "todayLearned": 0,
            "streakDays": 0
          },
          "sessionPointer": null,
          "archived": []
        }
        """;
    
    public static final int INITIAL_SCHEMA_VERSION = 1;
}
