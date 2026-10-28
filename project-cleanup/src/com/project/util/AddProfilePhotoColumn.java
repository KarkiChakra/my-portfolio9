package com.project.util;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

public class AddProfilePhotoColumn {
    public static void main(String[] args) {
        try (Connection conn = DBUtil.getConnection(); Statement st = conn.createStatement()) {
            try {
                st.execute("ALTER TABLE users ADD (profile_photo VARCHAR2(255))");
                System.out.println("Added column users.profile_photo");
            } catch (SQLException e) {
                if (e.getMessage() != null && e.getMessage().toLowerCase().contains("already")) {
                    System.out.println("users.profile_photo already exists");
                } else {
                    e.printStackTrace();
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}

