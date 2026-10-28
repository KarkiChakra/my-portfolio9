package com.project.util;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Instant;

public class DebugEmailUpdate {
    public static void main(String[] args) throws Exception {
        try (Connection conn = DBUtil.getConnection()) {
            try (Statement st = conn.createStatement();
                 ResultSet rs = st.executeQuery("SELECT id, username, email FROM users ORDER BY id")) {
                int count = 0;
                Integer firstId = null;
                while (rs.next() && count < 5) {
                    int id = rs.getInt("id");
                    if (firstId == null) firstId = id;
                    System.out.println(id + " " + rs.getString("username") + " email=" + rs.getString("email"));
                    count++;
                }

                if (firstId == null) {
                    System.out.println("No users found");
                    return;
                }

                String newEmail = "test+" + Instant.now().getEpochSecond() + "@example.com";
                try (PreparedStatement ps = conn.prepareStatement("UPDATE users SET email = ? WHERE id = ?")) {
                    ps.setString(1, newEmail);
                    ps.setInt(2, firstId);
                    int updated = ps.executeUpdate();
                    System.out.println("Updated rows=" + updated + " set email for id=" + firstId + " -> " + newEmail);
                }

                try (PreparedStatement ps = conn.prepareStatement("SELECT email FROM users WHERE id = ?")) {
                    ps.setInt(1, firstId);
                    try (ResultSet rs2 = ps.executeQuery()) {
                        if (rs2.next()) {
                            System.out.println("Read back email=" + rs2.getString("email"));
                        }
                    }
                }
            }
        }
    }
}
