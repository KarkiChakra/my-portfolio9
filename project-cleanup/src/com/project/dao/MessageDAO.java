package com.project.dao;

import com.project.model.Message;
import com.project.util.DBUtil;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class MessageDAO {

    public List<Message> getAllMessages(int currentUserId) {
        List<Message> messages = new ArrayList<>();
        String sql = "SELECT m.id, m.user_id, m.content, m.image_path, m.created_at, u.username " +
                     "FROM messages m JOIN users u ON m.user_id = u.id " +
                     "ORDER BY m.created_at ASC";
        
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {
            
            while (rs.next()) {
                Message msg = new Message();
                int msgId = rs.getInt("id");
                msg.setId(msgId);
                msg.setUserId(rs.getInt("user_id"));
                msg.setContent(rs.getString("content"));
                msg.setImagePath(rs.getString("image_path"));
                msg.setCreatedAt(rs.getTimestamp("created_at"));
                msg.setUsername(rs.getString("username"));
                
                // Fetch reactions
                List<java.util.Map<String, Object>> reactions = new ArrayList<>();
                String rSql = "SELECT reaction, count(*) as cnt, " +
                              "SUM(CASE WHEN user_id = ? THEN 1 ELSE 0 END) as user_reacted " +
                              "FROM message_reactions " +
                              "WHERE message_id = ? " +
                              "GROUP BY reaction";
                try (PreparedStatement pstmtR = conn.prepareStatement(rSql)) {
                    pstmtR.setInt(1, currentUserId);
                    pstmtR.setInt(2, msgId);
                    try (ResultSet rsR = pstmtR.executeQuery()) {
                        while (rsR.next()) {
                            java.util.Map<String, Object> reaction = new java.util.HashMap<>();
                            reaction.put("emoji", rsR.getNString("reaction"));
                            reaction.put("count", rsR.getInt("cnt"));
                            reaction.put("userReacted", rsR.getInt("user_reacted") > 0);
                            reactions.add(reaction);
                        }
                    }
                }
                msg.setReactions(reactions);
                messages.add(msg);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return messages;
    }

    public void addMessage(int userId, String content, String imagePath) {
        String sql = "INSERT INTO messages (user_id, content, image_path, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, userId);
            pstmt.setNString(2, content);
            pstmt.setString(3, imagePath);
            pstmt.executeUpdate();
            
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    public void addMessage(int userId, String content) {
        addMessage(userId, content, null);
    }

    public boolean deleteMessage(int messageId, int userId) {
        String sql = "DELETE FROM messages WHERE id = ? AND user_id = ?";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, messageId);
            pstmt.setInt(2, userId);
            int rows = pstmt.executeUpdate();
            return rows > 0;
            
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public List<Message> getMessages(int lastId, int currentUserId) {
        List<Message> messages = new ArrayList<>();
        String sql = "SELECT * FROM (SELECT m.id, m.content, m.image_path, m.created_at, m.user_id, u.username " +
                     "FROM messages m JOIN users u ON m.user_id = u.id " +
                     "WHERE m.id > ? ORDER BY m.id DESC) WHERE ROWNUM <= 50 ORDER BY id ASC";
        
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, lastId);
            
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    Message msg = new Message();
                    int msgId = rs.getInt("id");
                    msg.setId(msgId);
                    msg.setUserId(rs.getInt("user_id"));
                    msg.setContent(rs.getNString("content"));
                    msg.setImagePath(rs.getString("image_path"));
                    msg.setCreatedAt(rs.getTimestamp("created_at"));
                    msg.setUsername(rs.getString("username"));
                    
                    // Fetch reactions
                    List<java.util.Map<String, Object>> reactions = new ArrayList<>();
                    String rSql = "SELECT reaction, count(*) as cnt, " +
                                  "SUM(CASE WHEN user_id = ? THEN 1 ELSE 0 END) as user_reacted " +
                                  "FROM message_reactions " +
                                  "WHERE message_id = ? " +
                                  "GROUP BY reaction";
                    try (PreparedStatement pstmtR = conn.prepareStatement(rSql)) {
                        pstmtR.setInt(1, currentUserId);
                        pstmtR.setInt(2, msgId);
                        try (ResultSet rsR = pstmtR.executeQuery()) {
                            while (rsR.next()) {
                                java.util.Map<String, Object> reaction = new java.util.HashMap<>();
                                reaction.put("emoji", rsR.getNString("reaction"));
                                reaction.put("count", rsR.getInt("cnt"));
                                reaction.put("userReacted", rsR.getInt("user_reacted") > 0);
                                reactions.add(reaction);
                            }
                        }
                    }
                    msg.setReactions(reactions);
                    messages.add(msg);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return messages;
    }
}
