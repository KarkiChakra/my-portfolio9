package com.project.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.sql.SQLException;

public class SchemaUpdateReset {
    public static void main(String[] args) {
        try (Connection conn = DBUtil.getConnection();
             Statement stmt = conn.createStatement()) {
             
            try {
                stmt.execute("ALTER TABLE users ADD reset_code VARCHAR2(10)");
                System.out.println("reset_code column added.");
            } catch (SQLException e) {
                if (e.getErrorCode() == 1430) { 
                    System.out.println("reset_code column already exists.");
                } else {
                    e.printStackTrace();
                }
            }

            try {
                stmt.execute("ALTER TABLE users ADD reset_expiry TIMESTAMP");
                System.out.println("reset_expiry column added.");
            } catch (SQLException e) {
                if (e.getErrorCode() == 1430) { 
                    System.out.println("reset_expiry column already exists.");
                } else {
                    e.printStackTrace();
                }
            }
            
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
