package com.project.model;

import java.sql.Timestamp;

public class Post {
    private int id;
    private int userId;
    private String title;
    private String content;
    private Timestamp createdAt;
    private String username;
    private java.util.Map<String, Integer> reactionCounts = new java.util.HashMap<>();
    private String currentUserReaction;
    private String imagePath;

    public Post() {}

    public Post(int id, int userId, String title, String content, Timestamp createdAt) {
        this.id = id;
        this.userId = userId;
        this.title = title;
        this.content = content;
        this.createdAt = createdAt;
    }

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getUserId() { return userId; }
    public void setUserId(int userId) { this.userId = userId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public java.util.Map<String, Integer> getReactionCounts() { return reactionCounts; }
    public void setReactionCounts(java.util.Map<String, Integer> reactionCounts) { this.reactionCounts = reactionCounts; }
    public void addReactionCount(String type, int count) { this.reactionCounts.put(type, count); }
    public int getCountByType(String type) { return this.reactionCounts.getOrDefault(type, 0); }

    public String getCurrentUserReaction() { return currentUserReaction; }
    public void setCurrentUserReaction(String currentUserReaction) { this.currentUserReaction = currentUserReaction; }

    public String getImagePath() { return imagePath; }
    public void setImagePath(String imagePath) { this.imagePath = imagePath; }
}
