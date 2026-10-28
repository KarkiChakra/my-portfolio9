package com.project.util;

import com.project.util.DBUtil;
import java.sql.*;

public class CheckConstraints {
    public static void main(String[] args) {
        try (Connection conn = DBUtil.getConnection()) {
            DatabaseMetaData meta = conn.getMetaData();
            try (ResultSet rs = meta.getImportedKeys(null, null, "COMMENTS")) {
                while (rs.next()) {
                    System.out.println("FK Name: " + rs.getString("FK_NAME"));
                    System.out.println("PK Table: " + rs.getString("PKTABLE_NAME"));
                    System.out.println("PK Column: " + rs.getString("PKCOLUMN_NAME"));
                    System.out.println("FK Column: " + rs.getString("FKCOLUMN_NAME"));
                    System.out.println("--------------------------------");
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}
