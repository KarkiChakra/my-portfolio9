package com.project.servlet;

import com.project.dao.PrivateMessageDAO;
import com.project.model.User;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;

@WebServlet("/mark_read")
public class MarkReadServlet extends HttpServlet {
    private PrivateMessageDAO privateMessageDAO = new PrivateMessageDAO();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        User user = (User) session.getAttribute("user");
        String senderIdParam = req.getParameter("senderId");
        
        if (senderIdParam != null && !senderIdParam.isEmpty()) {
            try {
                int senderId = Integer.parseInt(senderIdParam);
                privateMessageDAO.markAsRead(user.getId(), senderId);
            } catch (NumberFormatException e) {
                resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            }
        }
    }
}
