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
import java.io.PrintWriter;

@WebServlet("/delete_private_message")
public class DeletePrivateMessageServlet extends HttpServlet {
    private PrivateMessageDAO privateMessageDAO = new PrivateMessageDAO();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        User user = (User) session.getAttribute("user");
        String messageIdParam = req.getParameter("messageId");

        if (messageIdParam == null || messageIdParam.isEmpty()) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        try {
            int messageId = Integer.parseInt(messageIdParam);
            boolean success = privateMessageDAO.deletePrivateMessage(messageId, user.getId());
            
            resp.setContentType("application/json");
            resp.setCharacterEncoding("UTF-8");
            PrintWriter out = resp.getWriter();
            if (success) {
                out.print("{\"status\":\"success\"}");
            } else {
                out.print("{\"status\":\"error\", \"message\":\"Message not found or permission denied\"}");
            }
            out.flush();
        } catch (NumberFormatException e) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
        } catch (Exception e) {
            e.printStackTrace();
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        doPost(req, resp);
    }
}
