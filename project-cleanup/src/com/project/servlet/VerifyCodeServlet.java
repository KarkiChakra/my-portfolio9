package com.project.servlet;

import com.project.dao.UserDAO;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.io.PrintWriter;

@WebServlet("/verify_code")
public class VerifyCodeServlet extends HttpServlet {
    private final UserDAO userDAO = new UserDAO();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        req.setCharacterEncoding("UTF-8");
        String email = req.getParameter("email");
        String code = req.getParameter("code");
        
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter out = resp.getWriter();

        if (email == null || code == null) {
            out.print("{\"status\":\"error\",\"message\":\"Missing email or code\"}");
            return;
        }

        email = email.trim();
        Integer userId = userDAO.findUserIdByEmail(email);
        if (userId != null && userDAO.verifyResetCode(userId, code.trim())) {
            HttpSession session = req.getSession(true);
            session.setAttribute("RESET_USER_ID", userId);
            
            out.print("{\"status\":\"success\"}");
        } else {
            out.print("{\"status\":\"error\",\"message\":\"Invalid or expired code\"}");
        }
        out.flush();
    }
}
