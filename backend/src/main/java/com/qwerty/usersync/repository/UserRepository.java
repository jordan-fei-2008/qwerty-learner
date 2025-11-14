package com.qwerty.usersync.repository;

import com.qwerty.usersync.model.User;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Repository
public class UserRepository {
    private final JdbcTemplate jdbcTemplate;
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public UserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private static class UserRowMapper implements RowMapper<User> {
        @Override
        public User mapRow(ResultSet rs, int rowNum) throws SQLException {
            User user = new User();
            user.setId(rs.getLong("id"));
            user.setUsername(rs.getString("username"));
            user.setEmail(rs.getString("email"));
            user.setPasswordHash(rs.getString("password_hash"));
            user.setSecurityQuestion(rs.getString("security_question"));
            user.setSecurityAnswerHash(rs.getString("security_answer_hash"));
            
            String createdAtStr = rs.getString("created_at");
            if (createdAtStr != null) {
                user.setCreatedAt(LocalDateTime.parse(createdAtStr, FORMATTER));
            }
            
            String lastLoginAtStr = rs.getString("last_login_at");
            if (lastLoginAtStr != null) {
                user.setLastLoginAt(LocalDateTime.parse(lastLoginAtStr, FORMATTER));
            }
            
            return user;
        }
    }

    public User save(User user) {
        String sql = "INSERT INTO users (username, email, password_hash, security_question, security_answer_hash, created_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?)";
        
        jdbcTemplate.update(sql,
            user.getUsername(),
            user.getEmail(),
            user.getPasswordHash(),
            user.getSecurityQuestion(),
            user.getSecurityAnswerHash(),
            LocalDateTime.now().format(FORMATTER)
        );
        
        // SQLite-specific way to get last inserted ID
        Long id = jdbcTemplate.queryForObject("SELECT last_insert_rowid()", Long.class);
        if (id != null) {
            user.setId(id);
        }
        
        return user;
    }

    public Optional<User> findByUsername(String username) {
        String sql = "SELECT * FROM users WHERE username = ?";
        return jdbcTemplate.query(sql, new UserRowMapper(), username).stream().findFirst();
    }

    public Optional<User> findByEmail(String email) {
        String sql = "SELECT * FROM users WHERE email = ?";
        return jdbcTemplate.query(sql, new UserRowMapper(), email).stream().findFirst();
    }

    public Optional<User> findById(Long id) {
        String sql = "SELECT * FROM users WHERE id = ?";
        return jdbcTemplate.query(sql, new UserRowMapper(), id).stream().findFirst();
    }

    public void updateLastLoginAt(Long userId, LocalDateTime lastLoginAt) {
        String sql = "UPDATE users SET last_login_at = ? WHERE id = ?";
        jdbcTemplate.update(sql, lastLoginAt.format(FORMATTER), userId);
    }

    public void updatePasswordHash(Long userId, String passwordHash) {
        String sql = "UPDATE users SET password_hash = ? WHERE id = ?";
        jdbcTemplate.update(sql, passwordHash, userId);
    }

    public boolean existsByUsername(String username) {
        String sql = "SELECT COUNT(*) FROM users WHERE username = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, username);
        return count != null && count > 0;
    }

    public boolean existsByEmail(String email) {
        // Return false for null or empty email to avoid false positives
        if (email == null || email.trim().isEmpty()) {
            return false;
        }
        String sql = "SELECT COUNT(*) FROM users WHERE email = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, email);
        return count != null && count > 0;
    }
}
