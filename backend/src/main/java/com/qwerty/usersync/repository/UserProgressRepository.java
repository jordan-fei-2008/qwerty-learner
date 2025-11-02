package com.qwerty.usersync.repository;

import com.qwerty.usersync.model.UserProgress;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Repository
public class UserProgressRepository {
    private final JdbcTemplate jdbcTemplate;
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public UserProgressRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private static class UserProgressRowMapper implements RowMapper<UserProgress> {
        @Override
        public UserProgress mapRow(ResultSet rs, int rowNum) throws SQLException {
            UserProgress progress = new UserProgress();
            progress.setUserId(rs.getLong("user_id"));
            progress.setSchemaVersion(rs.getInt("schema_version"));
            progress.setProgressJson(rs.getString("progress_json"));
            
            String updatedAtStr = rs.getString("updated_at");
            if (updatedAtStr != null) {
                progress.setUpdatedAt(LocalDateTime.parse(updatedAtStr, FORMATTER));
            }
            
            return progress;
        }
    }

    public UserProgress save(UserProgress progress) {
        String sql = "INSERT INTO user_progress (user_id, schema_version, progress_json, updated_at) " +
                     "VALUES (?, ?, ?, ?)";
        
        jdbcTemplate.update(sql, 
            progress.getUserId(),
            progress.getSchemaVersion(),
            progress.getProgressJson(),
            LocalDateTime.now().format(FORMATTER)
        );
        
        return progress;
    }

    public Optional<UserProgress> findByUserId(Long userId) {
        String sql = "SELECT * FROM user_progress WHERE user_id = ?";
        return jdbcTemplate.query(sql, new UserProgressRowMapper(), userId).stream().findFirst();
    }

    public void update(UserProgress progress) {
        String sql = "UPDATE user_progress SET schema_version = ?, progress_json = ?, updated_at = ? WHERE user_id = ?";
        jdbcTemplate.update(sql, 
            progress.getSchemaVersion(),
            progress.getProgressJson(),
            LocalDateTime.now().format(FORMATTER),
            progress.getUserId()
        );
    }

    public boolean existsByUserId(Long userId) {
        String sql = "SELECT COUNT(*) FROM user_progress WHERE user_id = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, userId);
        return count != null && count > 0;
    }
}
