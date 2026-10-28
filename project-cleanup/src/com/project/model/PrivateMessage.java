package com.project.model;

import java.sql.Timestamp;
import java.util.List;
import java.util.Map;

public class PrivateMessage {
    private int id;
    private int senderId;
    private int receiverId;
    private String content;
    private String imagePath;
    private Timestamp createdAt;
    private int isRead;
    private String username; // Sender's username
    private List<Map<String, Object>> reactions;

    public PrivateMessage() {}

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getSenderId() { return senderId; }
    public void setSenderId(int senderId) { this.senderId = senderId; }

    public int getReceiverId() { return receiverId; }
    public void setReceiverId(int receiverId) { this.receiverId = receiverId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getImagePath() { return imagePath; }
    public void setImagePath(String imagePath) { this.imagePath = imagePath; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    public int getIsRead() { return isRead; }
    public void setIsRead(int isRead) { this.isRead = isRead; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public List<Map<String, Object>> getReactions() { return reactions; }
    public void setReactions(List<Map<String, Object>> reactions) { this.reactions = reactions; }
}
