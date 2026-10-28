package com.project.servlet;

import com.project.dao.UserDAO;
import com.project.model.User;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;

@WebServlet("/login")
public class LoginServlet extends HttpServlet {
    private UserDAO userDAO = new UserDAO();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession existingSession = req.getSession(false);
        if (existingSession != null) {
            existingSession.invalidate();
        }

        String username = req.getParameter("username");
        String password =  req.getParameter("password");

        User user = userDAO.authenticate(username, password);

        if (user != null) {
            HttpSession newSession = req.getSession(true);
            newSession.setAttribute("user", user);
            resp.sendRedirect("posts");
        } else {
            req.setAttribute("loginError", "Invalid username or password");
            req.setAttribute("username", username);
            req.getRequestDispatcher("login.jsp").forward(req, resp);
        }
    }
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession existingSession = req.getSession(false);
        if (existingSession != null && existingSession.getAttribute("user") != null) {
            existingSession.invalidate();
        }
        req.getRequestDispatcher("login.jsp").forward(req, resp);
    }
}
