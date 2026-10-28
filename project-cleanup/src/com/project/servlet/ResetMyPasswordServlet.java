package com.project.servlet;

import com.project.dao.UserDAO;
import com.project.model.User;
import com.project.util.BCrypt;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.io.PrintWriter;
import java.security.SecureRandom;

@WebServlet("/reset_my_password")
public class ResetMyPasswordServlet extends HttpServlet {
    private final UserDAO userDAO = new UserDAO();
    private final SecureRandom random = new SecureRandom();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        User user = (User) session.getAttribute("user");

        String tempPassword = generateTempPassword(10);
        String hashed = BCrypt.hashpw(tempPassword, BCrypt.gensalt());
        boolean ok = userDAO.updatePasswordByUserId(user.getId(), hashed);

        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter out = resp.getWriter();
        if (ok) {
            out.print("{\"status\":\"success\",\"tempPassword\":\"" + escapeJson(tempPassword) + "\"}");
        } else {
            out.print("{\"status\":\"error\",\"message\":\"Failed to reset password\"}");
        }
        out.flush();
    }

    private String generateTempPassword(int len) {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#";
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }

    private String escapeJson(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}

