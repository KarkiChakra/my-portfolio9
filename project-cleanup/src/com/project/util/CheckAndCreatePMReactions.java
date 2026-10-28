package com.project.util;

import java.sql.Connection;
import java.sql.Statement;
import java.sql.SQLException;

public class CheckAndCreatePMReactions {
    public static void main(String[] args) {
        String createSql = "CREATE TABLE private_message_reactions (" +
                           "id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, " +
                           "message_id NUMBER NOT NULL, " +
                           "user_id NUMBER NOT NULL, " +
                           "reaction NVARCHAR2(50) NOT NULL, " +
                           "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                           "FOREIGN KEY (message_id) REFERENCES private_messages(id) ON DELETE CASCADE, " +
                           "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, " +
                           "CONSTRAINT unique_pm_reaction UNIQUE (message_id, user_id, reaction))";

        try (Connection conn = DBUtil.getConnection();
             Statement stmt = conn.createStatement()) {
            
            try {
                stmt.execute(createSql);
                System.out.println("Created table private_message_reactions.");
            } catch (SQLException e) {
                if (e.getMessage().contains("name is already used")) {
                    System.out.println("Table private_message_reactions already exists.");
                } else {
                    e.printStackTrace();
                }
            }
            
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}
