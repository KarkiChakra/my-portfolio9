package com.project.servlet;

import com.project.dao.UserDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.sql.SQLException;

@WebServlet("/register")
public class RegisterServlet extends HttpServlet {
    private UserDAO userDAO = new UserDAO();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        req.getRequestDispatcher("register.jsp").forward(req, resp);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String username = req.getParameter("username");
        String email = req.getParameter("email");
        String password = req.getParameter("password");
        String confirmPassword = req.getParameter("confirmPassword");

        if (username == null || username.trim().isEmpty() || 
            password == null || password.trim().isEmpty()) {
            req.setAttribute("registerError", "All fields are required");
            req.getRequestDispatcher("login.jsp").forward(req, resp);
            return;
        }

        if (!password.equals(confirmPassword)) {
            req.setAttribute("registerError", "Passwords do not match");
            req.getRequestDispatcher("login.jsp").forward(req, resp);
            return;
        }

        try {
            userDAO.register(username, password, email);
            resp.sendRedirect("login?registered=true");
        } catch (SQLException e) {
            e.printStackTrace();
            String errorMessage = "Registration failed";
            if (e.getMessage() != null) {
                if (e.getMessage().contains("unique constraint") || e.getMessage().contains("ORA-00001")) {
                    if (e.getMessage().toLowerCase().contains("email")) {
                        errorMessage = "Email already used";
                    } else {
                        errorMessage = "Username already taken";
                    }
                } else if (e.getMessage().contains("ORA-01017")) {
                    errorMessage = "Database configuration error. Please contact the administrator.";
                } else {
                    errorMessage = "Registration failed due to a server error.";
                }
            }
            req.setAttribute("registerError", errorMessage);
            req.getRequestDispatcher("login.jsp").forward(req, resp);
        }
    }
}
