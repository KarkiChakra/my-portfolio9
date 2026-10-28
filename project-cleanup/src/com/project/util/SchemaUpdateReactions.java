package com.project.util;

import java.sql.Connection;
import java.sql.Statement;
import java.sql.SQLException;

public class SchemaUpdateReactions {
    public static void main(String[] args) {
        String dropLikesSql = "DROP TABLE post_likes";
        String dropReactionsSql = "DROP TABLE post_reactions";
        
        String createSql = "CREATE TABLE post_reactions (" +
                           "id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, " +
                           "user_id NUMBER NOT NULL, " +
                           "post_id NUMBER NOT NULL, " +
                           "reaction_type NVARCHAR2(50) NOT NULL, " +
                           "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                           "CONSTRAINT fk_react_user FOREIGN KEY (user_id) REFERENCES users(id), " +
                           "CONSTRAINT fk_react_post FOREIGN KEY (post_id) REFERENCES posts(id), " +
                           "CONSTRAINT unique_post_react UNIQUE (user_id, post_id, reaction_type))";

        try (Connection conn = DBUtil.getConnection();
             Statement stmt = conn.createStatement()) {
            
            try {
                stmt.execute(dropLikesSql);
                System.out.println("Dropped table post_likes.");
            } catch (SQLException e) {
                // Ignore if not exists
            }

            try {
                stmt.execute(dropReactionsSql);
                System.out.println("Dropped table post_reactions.");
            } catch (SQLException e) {
                // Ignore if not exists
            }

            try {
                stmt.execute(createSql);
                System.out.println("Created table post_reactions.");
            } catch (SQLException e) {
                if (e.getMessage().contains("name is already used")) {
                    System.out.println("Table post_reactions already exists.");
                } else {
                    e.printStackTrace();
                }
            }
            
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}
