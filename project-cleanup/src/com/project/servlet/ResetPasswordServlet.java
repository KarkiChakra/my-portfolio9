package com.project.servlet;

import com.project.dao.UserDAO;
import com.project.util.BCrypt;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.io.PrintWriter;

@WebServlet("/reset_password_new")
public class ResetPasswordServlet extends HttpServlet {
    private final UserDAO userDAO = new UserDAO();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        req.setCharacterEncoding("UTF-8");
        HttpSession session = req.getSession(false);
        
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter out = resp.getWriter();

        if (session == null || session.getAttribute("RESET_USER_ID") == null) {
            out.print("{\"status\":\"error\",\"message\":\"Session expired. Please start over.\"}");
            return;
        }

        Integer userId = (Integer) session.getAttribute("RESET_USER_ID");
        String newPassword = req.getParameter("password");
        
        if (newPassword == null || newPassword.trim().isEmpty()) {
            out.print("{\"status\":\"error\",\"message\":\"Password required\"}");
            return;
        }

        String hashed = BCrypt.hashpw(newPassword, BCrypt.gensalt());
        boolean ok = userDAO.updatePasswordByUserId(userId, hashed);
        
        if (ok) {
            userDAO.clearResetCode(userId);
            session.removeAttribute("RESET_USER_ID");
            session.removeAttribute("RESET_EMAIL");
            out.print("{\"status\":\"success\"}");
        } else {
            out.print("{\"status\":\"error\",\"message\":\"Failed to update password\"}");
        }
        out.flush();
    }
}
