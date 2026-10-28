package com.project.dao;

import com.project.model.PrivateMessage;
import com.project.util.DBUtil;

import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class PrivateMessageDAO {

    public List<PrivateMessage> getPrivateMessages(int userId1, int userId2, int lastId) {
        List<PrivateMessage> messages = new ArrayList<>();
        String sql = "SELECT * FROM (SELECT m.id, m.sender_id, m.receiver_id, m.content, m.image_path, m.created_at, u.username " +
                     "FROM private_messages m JOIN users u ON m.sender_id = u.id " +
                     "WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)) " +
                     "AND m.id > ? " +
                     "ORDER BY m.id DESC) WHERE ROWNUM <= 50 ORDER BY id ASC";
        
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, userId1);
            pstmt.setInt(2, userId2);
            pstmt.setInt(3, userId2);
            pstmt.setInt(4, userId1);
            pstmt.setInt(5, lastId);
            
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    PrivateMessage msg = new PrivateMessage();
                    int msgId = rs.getInt("id");
                    msg.setId(msgId);
                    msg.setSenderId(rs.getInt("sender_id"));
                    msg.setReceiverId(rs.getInt("receiver_id"));
                    msg.setContent(rs.getNString("content"));
                    msg.setImagePath(rs.getString("image_path"));
                    msg.setCreatedAt(rs.getTimestamp("created_at"));
                    msg.setUsername(rs.getString("username"));
                    
                    // Fetch reactions
                    List<Map<String, Object>> reactions = new ArrayList<>();
                    String rSql = "SELECT reaction, count(*) as cnt, " +
                                  "SUM(CASE WHEN user_id = ? THEN 1 ELSE 0 END) as user_reacted " +
                                  "FROM private_message_reactions " +
                                  "WHERE message_id = ? " +
                                  "GROUP BY reaction";
                    try (PreparedStatement pstmtR = conn.prepareStatement(rSql)) {
                        pstmtR.setInt(1, userId1); // Using current user's ID for reaction status
                        pstmtR.setInt(2, msgId);
                        try (ResultSet rsR = pstmtR.executeQuery()) {
                            while (rsR.next()) {
                                Map<String, Object> reaction = new HashMap<>();
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

    public void addPrivateMessage(int senderId, int receiverId, String content, String imagePath) {
        String sql = "INSERT INTO private_messages (sender_id, receiver_id, content, image_path) VALUES (?, ?, ?, ?)";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, senderId);
            pstmt.setInt(2, receiverId);
            pstmt.setNString(3, content);
            pstmt.setString(4, imagePath);
            pstmt.executeUpdate();
            
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    public void markAsRead(int receiverId, int senderId) {
        String sql = "UPDATE private_messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ? AND is_read = 0";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, receiverId);
            pstmt.setInt(2, senderId);
            pstmt.executeUpdate();
            
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    public int getTotalUnreadCount(int userId) {
        String sql = "SELECT COUNT(*) FROM private_messages WHERE receiver_id = ? AND is_read = 0";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, userId);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt(1);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return 0;
    }

    public boolean deletePrivateMessage(int messageId, int userId) {
        String sql = "DELETE FROM private_messages WHERE id = ? AND sender_id = ?";
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
}
