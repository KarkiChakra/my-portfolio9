package com.project.dao;

import com.project.model.User;
import com.project.util.BCrypt;
import com.project.util.DBUtil;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public class UserDAO {

    public User authenticate(String username, String password) {
        String sql = "SELECT * FROM users WHERE username = ?";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, username);

            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    String storedPassword = rs.getString("password");
                    boolean matched = false;

                    if (storedPassword != null && storedPassword.startsWith("$2a$")) {
                        matched = BCrypt.checkpw(password, storedPassword);
                    } else {
                        if (storedPassword != null && storedPassword.equals(password)) {
                            matched = true;
                            String newHash = BCrypt.hashpw(password, BCrypt.gensalt());
                            updatePasswordHash(conn, rs.getInt("id"), newHash);
                        }
                    }

                    if (matched) {
                        User user = new User();
                        user.setId(rs.getInt("id"));
                        user.setUsername(rs.getString("username"));
                        user.setCreatedAt(rs.getTimestamp("created_at"));
                        try { user.setProfilePhoto(rs.getString("profile_photo")); } catch (SQLException ignore) {}
                        try { user.setCoverPhoto(rs.getString("cover_photo")); } catch (SQLException ignore) {}
                        try { user.setEmail(rs.getString("email")); } catch (SQLException ignore) {}
                        try { user.setBio(rs.getString("bio")); } catch (SQLException ignore) {}
                        return user;
                    }
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    private void updatePasswordHash(Connection conn, int userId, String newHash) throws SQLException {
        String updateSql = "UPDATE users SET password = ? WHERE id = ?";
        try (PreparedStatement pstmt = conn.prepareStatement(updateSql)) {
            pstmt.setString(1, newHash);
            pstmt.setInt(2, userId);
            pstmt.executeUpdate();
        }
    }

    public void register(String username, String password, String email) throws SQLException {
        String hashed = BCrypt.hashpw(password, BCrypt.gensalt());
        // Try insert with email if column exists; fallback to without email
        try (Connection conn = DBUtil.getConnection()) {
            String sqlWithEmail = "INSERT INTO users (username, password, email) VALUES (?, ?, ?)";
            try (PreparedStatement pstmt = conn.prepareStatement(sqlWithEmail)) {
                pstmt.setString(1, username);
                pstmt.setString(2, hashed);
                pstmt.setString(3, email);
                pstmt.executeUpdate();
                return;
            } catch (SQLException ex) {
                String msg = ex.getMessage() != null ? ex.getMessage() : "";
                if (!(msg.contains("invalid identifier") || msg.contains("ORA-00904"))) {
                    throw ex;
                }
                // Fallback: table without email column
                String sqlNoEmail = "INSERT INTO users (username, password) VALUES (?, ?)";
                try (PreparedStatement pstmt2 = conn.prepareStatement(sqlNoEmail)) {
                    pstmt2.setString(1, username);
                    pstmt2.setString(2, hashed);
                    pstmt2.executeUpdate();
                }
            }
        }
    }

    public Integer findUserIdByEmail(String email) {
        String sql = "SELECT id FROM users WHERE email = ?";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, email);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) return rs.getInt("id");
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public Integer findUserIdByUsername(String username) {
        String sql = "SELECT id FROM users WHERE username = ?";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, username);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) return rs.getInt("id");
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public boolean updatePasswordByUserId(int userId, String newHashed) {
        String sql = "UPDATE users SET password = ? WHERE id = ?";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, newHashed);
            pstmt.setInt(2, userId);
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public String getProfilePhotoPath(int userId) {
        String sql = "SELECT profile_photo FROM users WHERE id = ?";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setInt(1, userId);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getString("profile_photo");
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public boolean updateProfilePhotoPath(int userId, String path) {
        String sql = "UPDATE users SET profile_photo = ? WHERE id = ?";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, path);
            pstmt.setInt(2, userId);
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public String getCoverPhotoPath(int userId) {
        String sql = "SELECT cover_photo FROM users WHERE id = ?";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setInt(1, userId);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getString("cover_photo");
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public boolean updateCoverPhotoPath(int userId, String path) {
        String sql = "UPDATE users SET cover_photo = ? WHERE id = ?";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, path);
            pstmt.setInt(2, userId);
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public String getEmailByUserId(int userId) {
        String sql = "SELECT email FROM users WHERE id = ?";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setInt(1, userId);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) return rs.getString("email");
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public java.util.List<java.util.Map<String, Object>> getAllUsersWithUnreadCount(int currentUserId) {
        java.util.List<java.util.Map<String, Object>> users = new java.util.ArrayList<>();
        String sql = "SELECT u.id, u.username, " +
                     "(SELECT COUNT(*) FROM private_messages pm WHERE pm.sender_id = u.id AND pm.receiver_id = ? AND pm.is_read = 0) as unread_count " +
                     "FROM users u WHERE u.id != ? ORDER BY u.username";
        
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, currentUserId);
            pstmt.setInt(2, currentUserId);
            
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    java.util.Map<String, Object> user = new java.util.HashMap<>();
                    user.put("id", rs.getInt("id"));
                    user.put("username", rs.getString("username"));
                    user.put("unread_count", rs.getInt("unread_count"));
                    users.add(user);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return users;
    }

    public String getBioByUserId(int userId) {
        String sql = "SELECT bio FROM users WHERE id = ?";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setInt(1, userId);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getString("bio");
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public boolean updateBio(int userId, String bio) {
        String sql = "UPDATE users SET bio = ? WHERE id = ?";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setNString(1, bio); // Use setNString for NVARCHAR2
            pstmt.setInt(2, userId);
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean updateEmail(int userId, String email) {
        String sql = "UPDATE users SET email = ? WHERE id = ?";
        try {
            return updateEmailOnce(sql, userId, email);
        } catch (SQLException e) {
            if (isMissingColumnError(e)) {
                try {
                    ensureEmailColumnExists();
                    return updateEmailOnce(sql, userId, email);
                } catch (SQLException ex) {
                    ex.printStackTrace();
                    return false;
                }
            }
            e.printStackTrace();
            return false;
        }
    }

    private boolean updateEmailOnce(String sql, int userId, String email) throws SQLException {
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, email);
            pstmt.setInt(2, userId);
            int updated = pstmt.executeUpdate();
            if (updated > 0) return true;
            // If no row reported as updated, confirm state; treat as success when already set
            try (PreparedStatement check = conn.prepareStatement("SELECT email FROM users WHERE id = ?")) {
                check.setInt(1, userId);
                try (ResultSet rs = check.executeQuery()) {
                    if (rs.next()) {
                        String current = rs.getString(1);
                        if ((current == null && email == null) || (current != null && current.equals(email))) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }
    }

    public void saveResetCode(int userId, String code) {
        String sql = "UPDATE users SET reset_code = ?, reset_expiry = ? WHERE id = ?";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, code);
            // 15 minutes expiry
            pstmt.setTimestamp(2, java.sql.Timestamp.from(java.time.Instant.now().plusSeconds(15 * 60)));
            pstmt.setInt(3, userId);
            pstmt.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    public boolean verifyResetCode(int userId, String code) {
        String sql = "SELECT id FROM users WHERE id = ? AND reset_code = ? AND reset_expiry > ?";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setInt(1, userId);
            pstmt.setString(2, code);
            pstmt.setTimestamp(3, java.sql.Timestamp.from(java.time.Instant.now()));
            try (ResultSet rs = pstmt.executeQuery()) {
                return rs.next();
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    public void clearResetCode(int userId) {
        String sql = "UPDATE users SET reset_code = NULL, reset_expiry = NULL WHERE id = ?";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setInt(1, userId);
            pstmt.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    private boolean isMissingColumnError(SQLException e) {
        if (e.getErrorCode() == 904) return true; // ORA-00904 invalid identifier
        String msg = e.getMessage() != null ? e.getMessage() : "";
        return msg.contains("ORA-00904") || msg.toLowerCase().contains("invalid identifier");
    }

    private void ensureEmailColumnExists() throws SQLException {
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement("ALTER TABLE users ADD email VARCHAR2(100)")) {
            pstmt.executeUpdate();
        } catch (SQLException e) {
            if (e.getErrorCode() == 1430) return; // ORA-01430 column already exists
            String msg = e.getMessage() != null ? e.getMessage() : "";
            if (msg.contains("ORA-01430")) return;
            throw e;
        }
    }
}
