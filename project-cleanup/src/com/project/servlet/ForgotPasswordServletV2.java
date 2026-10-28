package com.project.servlet;

import com.project.dao.UserDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;
import java.security.SecureRandom;

@WebServlet("/forgot_password")
public class ForgotPasswordServletV2 extends HttpServlet {
    private final UserDAO userDAO = new UserDAO();
    private final SecureRandom random = new SecureRandom();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        req.setCharacterEncoding("UTF-8");
        String email = req.getParameter("email");
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter out = resp.getWriter();

        if (email == null || email.trim().isEmpty()) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            out.print("{\"status\":\"error\",\"message\":\"Email is required\"}");
            return;
        }

        email = email.trim();
        Integer userId = userDAO.findUserIdByEmail(email);
        if (userId == null) {
            out.print("{\"status\":\"error\",\"message\":\"Email not found\"}");
            return;
        }

        int code = 100000 + random.nextInt(900000);
        String codeStr = String.valueOf(code);

        userDAO.saveResetCode(userId, codeStr);

        try {
            com.project.util.EmailUtility.sendEmail(
                    email,
                    "LinkUP Password Reset Code",
                    "Your verification code is: " + codeStr + "\n\nThis code expires in 15 minutes."
            );
            out.print("{\"status\":\"success\",\"message\":\"Code sent to your email.\"}");
        } catch (jakarta.mail.MessagingException e) {
            out.print("{\"status\":\"error\",\"message\":\"" + escapeJson(e.getMessage()) + "\"}");
        } catch (Exception e) {
            out.print("{\"status\":\"error\",\"message\":\"Failed to send verification email.\"}");
        }
        out.flush();
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder(s.length() + 16);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '\\') sb.append("\\\\");
            else if (c == '"') sb.append("\\\"");
            else if (c == '\n') sb.append("\\n");
            else if (c == '\r') sb.append("\\r");
            else if (c == '\t') sb.append("\\t");
            else if (c < 0x20) sb.append(' ');
            else sb.append(c);
        }
        return sb.toString();
    }
}
