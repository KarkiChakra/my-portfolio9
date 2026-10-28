package com.project.dao;

import com.project.util.DBUtil;
import java.sql.*;

public class ReactionDAO {

    public enum TargetType {
        POST("post_reactions", "post_id", "reaction_type"),
        CHAT("message_reactions", "message_id", "reaction"),
        PRIVATE_CHAT("private_message_reactions", "message_id", "reaction");

        public final String tableName;
        public final String idColumn;
        public final String typeColumn;

        TargetType(String tableName, String idColumn, String typeColumn) {
            this.tableName = tableName;
            this.idColumn = idColumn;
            this.typeColumn = typeColumn;
        }
    }

    public String toggleReaction(int userId, int targetId, String reaction, TargetType type) throws SQLException {
        String selectSql = "SELECT id, " + type.typeColumn + " FROM " + type.tableName + " WHERE user_id = ? AND " + type.idColumn + " = ?";

        try (Connection conn = DBUtil.getConnection()) {
            int existingId = -1;
            String existingReaction = null;

            try (PreparedStatement selectStmt = conn.prepareStatement(selectSql)) {
                selectStmt.setInt(1, userId);
                selectStmt.setInt(2, targetId);
                try (ResultSet rs = selectStmt.executeQuery()) {
                    if (rs.next()) {
                        existingId = rs.getInt("id");
                        existingReaction = rs.getNString(type.typeColumn);
                    }
                }
            }

            if (existingId != -1) {
                if (existingReaction != null && existingReaction.equals(reaction)) {
                    String deleteSql = "DELETE FROM " + type.tableName + " WHERE id = ?";
                    try (PreparedStatement deleteStmt = conn.prepareStatement(deleteSql)) {
                        deleteStmt.setInt(1, existingId);
                        deleteStmt.executeUpdate();
                        return "removed";
                    }
                } else {
                    String updateSql = "UPDATE " + type.tableName + " SET " + type.typeColumn + " = ? WHERE id = ?";
                    try (PreparedStatement updateStmt = conn.prepareStatement(updateSql)) {
                        updateStmt.setNString(1, reaction);
                        updateStmt.setInt(2, existingId);
                        updateStmt.executeUpdate();
                        return "added";
                    }
                }
            } else {
                String insertSql = "INSERT INTO " + type.tableName + " (user_id, " + type.idColumn + ", " + type.typeColumn + ") VALUES (?, ?, ?)";
                try (PreparedStatement insertStmt = conn.prepareStatement(insertSql)) {
                    insertStmt.setInt(1, userId);
                    insertStmt.setInt(2, targetId);
                    insertStmt.setNString(3, reaction);
                    insertStmt.executeUpdate();
                    return "added";
                }
            }
        }
    }

    public int getReactionUserCount(int targetId, TargetType type) throws SQLException {
        String sql = "SELECT COUNT(DISTINCT user_id) AS cnt FROM " + type.tableName + " WHERE " + type.idColumn + " = ?";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setInt(1, targetId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("cnt");
                }
            }
        }
        return 0;
    }
}
