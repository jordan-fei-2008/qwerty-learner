package com.qwerty.usersync.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DbInitConfig implements CommandLineRunner {
    
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        // Enable WAL mode for better concurrency
        jdbcTemplate.execute("PRAGMA journal_mode=WAL;");
        
        // Verify tables exist
        Integer userCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='users'", 
            Integer.class
        );
        
        if (userCount != null && userCount > 0) {
            System.out.println("Database initialized successfully. Tables verified.");
        } else {
            System.out.println("Warning: Users table not found. Check schema initialization.");
        }
    }
}
