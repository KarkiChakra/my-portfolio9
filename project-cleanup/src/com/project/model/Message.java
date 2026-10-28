package com.project.model;

import java.sql.Timestamp;

public class Message {
    private int id;
    private int userId;
    private String content;
    private Timestamp createdAt;
    private String username; // Helper field for display
    private String imagePath;
    private java.util.List<java.util.Map<String, Object>> reactions;

    public Message() {}

    public Message(int id, int userId, String content, Timestamp createdAt) {
        this.id = id;
        this.userId = userId;
        this.content = content;
        this.createdAt = createdAt;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getUserId() { return userId; }
    public void setUserId(int userId) { this.userId = userId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getImagePath() { return imagePath; }
    public void setImagePath(String imagePath) { this.imagePath = imagePath; }

    public java.util.List<java.util.Map<String, Object>> getReactions() { return reactions; }
    public void setReactions(java.util.List<java.util.Map<String, Object>> reactions) { this.reactions = reactions; }
}
