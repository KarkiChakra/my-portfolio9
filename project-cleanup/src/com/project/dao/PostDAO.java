package com.project.dao;

import com.project.model.Post;
import com.project.util.DBUtil;

import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class PostDAO {

    public void createPost(Post post) throws SQLException {
        String sql = "INSERT INTO posts (user_id, title, content, image_path) VALUES (?, ?, ?, ?)";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setInt(1, post.getUserId());
            pstmt.setString(2, post.getTitle());
            pstmt.setString(3, post.getContent());
            pstmt.setString(4, post.getImagePath());
            pstmt.executeUpdate();
        }
    }

    public void deletePost(int postId, int userId) throws SQLException {
        String checkSql = "SELECT id FROM posts WHERE id = ? AND user_id = ?";
        String deleteCommentsSql = "DELETE FROM comments WHERE post_id = ?";
        String deleteReactionsSql = "DELETE FROM post_reactions WHERE post_id = ?";
        String deletePostSql = "DELETE FROM posts WHERE id = ?";

        try (Connection conn = DBUtil.getConnection()) {
            conn.setAutoCommit(false);
            try {
                // 1. Verify ownership
                boolean isOwner = false;
                try (PreparedStatement pstmt = conn.prepareStatement(checkSql)) {
                    pstmt.setInt(1, postId);
                    pstmt.setInt(2, userId);
                    try (ResultSet rs = pstmt.executeQuery()) {
                        if (rs.next()) {
                            isOwner = true;
                        }
                    }
                }

                if (!isOwner) {
                    return; 
                }

                // 2. Delete comments
                try (PreparedStatement pstmt = conn.prepareStatement(deleteCommentsSql)) {
                    pstmt.setInt(1, postId);
                    pstmt.executeUpdate();
                }

                // 3. Delete reactions
                try (PreparedStatement pstmt = conn.prepareStatement(deleteReactionsSql)) {
                    pstmt.setInt(1, postId);
                    pstmt.executeUpdate();
                }

                // 4. Delete post
                try (PreparedStatement pstmt = conn.prepareStatement(deletePostSql)) {
                    pstmt.setInt(1, postId);
                    pstmt.executeUpdate();
                }

                conn.commit();
            } catch (SQLException e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    public void toggleReaction(int userId, int postId, String type) throws SQLException {
        String checkSql = "SELECT reaction_type FROM post_reactions WHERE user_id = ? AND post_id = ?";
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement checkStmt = conn.prepareStatement(checkSql)) {
            
            checkStmt.setInt(1, userId);
            checkStmt.setInt(2, postId);
            
            try (ResultSet rs = checkStmt.executeQuery()) {
                if (rs.next()) {
                    String currentType = rs.getString("reaction_type");
                    if (currentType.equals(type)) {
                        // Same reaction: remove it (toggle off)
                        String deleteSql = "DELETE FROM post_reactions WHERE user_id = ? AND post_id = ?";
                        try (PreparedStatement deleteStmt = conn.prepareStatement(deleteSql)) {
                            deleteStmt.setInt(1, userId);
                            deleteStmt.setInt(2, postId);
                            deleteStmt.executeUpdate();
                        }
                    } else {
                        // Different reaction: update it
                        String updateSql = "UPDATE post_reactions SET reaction_type = ? WHERE user_id = ? AND post_id = ?";
                        try (PreparedStatement updateStmt = conn.prepareStatement(updateSql)) {
                            updateStmt.setString(1, type);
                            updateStmt.setInt(2, userId);
                            updateStmt.setInt(3, postId);
                            updateStmt.executeUpdate();
                        }
                    }
                } else {
                    // No reaction: insert new one
                    String insertSql = "INSERT INTO post_reactions (user_id, post_id, reaction_type) VALUES (?, ?, ?)";
                    try (PreparedStatement insertStmt = conn.prepareStatement(insertSql)) {
                        insertStmt.setInt(1, userId);
                        insertStmt.setInt(2, postId);
                        insertStmt.setString(3, type);
                        insertStmt.executeUpdate();
                    }
                }
            }
        }
    }

    public List<Post> getAllPosts() {
        return getAllPosts(-1);
    }

    public List<Post> getAllPosts(int currentUserId) {
        List<Post> posts = new ArrayList<>();
        String sql = "SELECT p.*, u.username FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC";
        
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql);
             ResultSet rs = pstmt.executeQuery()) {
             
            while (rs.next()) {
                Post post = new Post();
                post.setId(rs.getInt("id"));
                post.setUserId(rs.getInt("user_id"));
                post.setTitle(rs.getString("title"));
                post.setContent(rs.getString("content"));
                post.setCreatedAt(rs.getTimestamp("created_at"));
                post.setUsername(rs.getString("username"));
                post.setImagePath(rs.getString("image_path"));
                
                // Populate reactions
                loadReactions(conn, post, currentUserId);
                
                posts.add(post);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return posts;
    }

    public List<Post> getPostsByUserId(int userId) {
        List<Post> posts = new ArrayList<>();
        String sql = "SELECT p.*, u.username FROM posts p JOIN users u ON p.user_id = u.id WHERE p.user_id = ? ORDER BY p.created_at DESC";
        
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
             
            pstmt.setInt(1, userId);
            
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    Post post = new Post();
                    post.setId(rs.getInt("id"));
                    post.setUserId(rs.getInt("user_id"));
                    post.setTitle(rs.getString("title"));
                    post.setContent(rs.getString("content"));
                    post.setCreatedAt(rs.getTimestamp("created_at"));
                    post.setUsername(rs.getString("username"));
                    post.setImagePath(rs.getString("image_path"));
                    
                    // Populate reactions
                    loadReactions(conn, post, userId); // Use userId as current user for simplicity in own profile view
                    
                    posts.add(post);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return posts;
    }

    public Post getPostById(int id) {
        return getPostById(id, -1);
    }

    public Post getPostById(int id, int currentUserId) {
        String sql = "SELECT p.*, u.username FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?";
        
        try (Connection conn = DBUtil.getConnection();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            pstmt.setInt(1, id);
            
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    Post post = new Post();
                    post.setId(rs.getInt("id"));
                    post.setUserId(rs.getInt("user_id"));
                    post.setTitle(rs.getString("title"));
                    post.setContent(rs.getString("content"));
                    post.setCreatedAt(rs.getTimestamp("created_at"));
                    post.setUsername(rs.getString("username"));
                    post.setImagePath(rs.getString("image_path"));
                    
                    loadReactions(conn, post, currentUserId);
                    
                    return post;
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    private void loadReactions(Connection conn, Post post, int currentUserId) {
        // 1. Get counts (distinct users per reaction type)
        String countSql = "SELECT reaction_type, COUNT(DISTINCT user_id) as cnt FROM post_reactions WHERE post_id = ? GROUP BY reaction_type";
        try (PreparedStatement pstmt = conn.prepareStatement(countSql)) {
            pstmt.setInt(1, post.getId());
            try (ResultSet rs = pstmt.executeQuery()) {
                while (rs.next()) {
                    post.addReactionCount(rs.getString("reaction_type"), rs.getInt("cnt"));
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }

        // 2. Get current user's reaction
        if (currentUserId != -1) {
            String myReactionSql = "SELECT reaction_type FROM post_reactions WHERE post_id = ? AND user_id = ?";
            try (PreparedStatement pstmt = conn.prepareStatement(myReactionSql)) {
                pstmt.setInt(1, post.getId());
                pstmt.setInt(2, currentUserId);
                try (ResultSet rs = pstmt.executeQuery()) {
                    if (rs.next()) {
                        post.setCurrentUserReaction(rs.getString("reaction_type"));
                    }
                }
            } catch (SQLException e) {
                e.printStackTrace();
            }
        }
    }
}
