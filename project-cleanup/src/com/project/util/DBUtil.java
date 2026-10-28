package com.project.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DBUtil {
    private static final String DEFAULT_URL = "jdbc:oracle:thin:@localhost:1521:orcl";

    static {
        try {
            // Load Oracle JDBC Driver
            Class.forName("oracle.jdbc.OracleDriver");
        } catch (ClassNotFoundException e) {
            throw new ExceptionInInitializerError("Oracle JDBC Driver not found");
        }
    }

    public static Connection getConnection() throws SQLException {
        String url = readSetting("PROJECT_DB_URL", "project.db.url", DEFAULT_URL);
        String username = readSetting("PROJECT_DB_USER", "project.db.user", null);
        String password = readSetting("PROJECT_DB_PASSWORD", "project.db.password", null);
        if (username == null || password == null) {
            throw new SQLException("Database credentials are not configured. Set PROJECT_DB_USER and PROJECT_DB_PASSWORD.");
        }
        return DriverManager.getConnection(url, username, password);
    }

    private static String readSetting(String environmentName, String propertyName, String defaultValue) {
        String value = System.getenv(environmentName);
        if (value == null || value.trim().isEmpty()) {
            value = System.getProperty(propertyName);
        }
        return value == null || value.trim().isEmpty() ? defaultValue : value.trim();
    }
}
