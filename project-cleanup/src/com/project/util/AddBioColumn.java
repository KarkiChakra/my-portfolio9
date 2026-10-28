package com.project.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.sql.SQLException;

public class AddBioColumn {
    public static void main(String[] args) {
        String url = "jdbc:oracle:thin:@localhost:1521:orcl";
        String user = "myproject";
        String password = "password123";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
             
            try {
                // Add bio column
                stmt.execute("ALTER TABLE users ADD bio NVARCHAR2(500)");
                System.out.println("bio column added successfully.");
            } catch (SQLException e) {
                if (e.getErrorCode() == 1430) { // ORA-01430: column being added already exists in table
                    System.out.println("bio column already exists.");
                } else {
                    e.printStackTrace();
                }
            }
            
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
