package com.project.util;

import java.sql.Connection;
import java.sql.Statement;
import java.sql.SQLException;

public class SchemaUpdateLikes {
    public static void main(String[] args) {
        String sql = "CREATE TABLE post_likes (" +
                     "user_id NUMBER, " +
                     "post_id NUMBER, " +
                     "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                     "PRIMARY KEY (user_id, post_id), " +
                     "CONSTRAINT fk_like_user FOREIGN KEY (user_id) REFERENCES users(id), " +
                     "CONSTRAINT fk_like_post FOREIGN KEY (post_id) REFERENCES posts(id))";

        try (Connection conn = DBUtil.getConnection();
             Statement stmt = conn.createStatement()) {
            
            try {
                stmt.execute(sql);
                System.out.println("Executed: " + sql);
            } catch (SQLException e) {
                if (e.getMessage().contains("name is already used")) {
                    System.out.println("Table post_likes already exists.");
                } else {
                    e.printStackTrace();
                }
            }
            
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}
