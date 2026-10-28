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

@WebServlet("/change_password")
public class ChangePasswordServlet extends HttpServlet {
    private final UserDAO userDAO = new UserDAO();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            resp.sendRedirect("login");
            return;
        }
        req.getRequestDispatcher("change_password.jsp").forward(req, resp);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            resp.sendRedirect("login");
            return;
        }
        req.setCharacterEncoding("UTF-8");

        User user = (User) session.getAttribute("user");
        String currentPassword = req.getParameter("currentPassword");
        String newPassword = req.getParameter("newPassword");
        String confirmPassword = req.getParameter("confirmPassword");

        if (currentPassword == null || currentPassword.isEmpty()
                || newPassword == null || newPassword.isEmpty()
                || confirmPassword == null || confirmPassword.isEmpty()) {
            req.setAttribute("error", "All fields are required");
            req.getRequestDispatcher("change_password.jsp").forward(req, resp);
            return;
        }

        if (!newPassword.equals(confirmPassword)) {
            req.setAttribute("error", "New passwords do not match");
            req.getRequestDispatcher("change_password.jsp").forward(req, resp);
            return;
        }

        if (newPassword.length() < 6) {
            req.setAttribute("error", "Password must be at least 6 characters");
            req.getRequestDispatcher("change_password.jsp").forward(req, resp);
            return;
        }

        if (userDAO.authenticate(user.getUsername(), currentPassword) == null) {
            req.setAttribute("error", "Current password is incorrect");
            req.getRequestDispatcher("change_password.jsp").forward(req, resp);
            return;
        }

        String hashed = BCrypt.hashpw(newPassword, BCrypt.gensalt());
        boolean ok = userDAO.updatePasswordByUserId(user.getId(), hashed);
        if (ok) {
            req.setAttribute("success", "Password changed successfully");
        } else {
            req.setAttribute("error", "Failed to change password");
        }
        req.getRequestDispatcher("change_password.jsp").forward(req, resp);
    }
}

