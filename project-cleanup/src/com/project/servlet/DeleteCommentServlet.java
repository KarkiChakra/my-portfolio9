package com.project.servlet;

import com.project.dao.CommentDAO;
import com.project.model.User;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.sql.SQLException;

@WebServlet("/delete_comment")
public class DeleteCommentServlet extends HttpServlet {
    private CommentDAO commentDAO = new CommentDAO();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        User user = (User) session.getAttribute("user");
        String commentIdStr = req.getParameter("commentId");
        String postIdStr = req.getParameter("postId");

        if (commentIdStr != null && postIdStr != null) {
            try {
                int commentId = Integer.parseInt(commentIdStr);
                int postId = Integer.parseInt(postIdStr);
                
                boolean success = commentDAO.deleteComment(commentId, user.getId());
                
                String requestedWith = req.getHeader("X-Requested-With");
                if ("XMLHttpRequest".equals(requestedWith)) {
                    resp.setContentType("application/json");
                    resp.getWriter().print("{\"status\":\"" + (success ? "success" : "error") + "\"}");
                } else {
                    resp.sendRedirect("post?id=" + postId);
                }
            } catch (NumberFormatException | SQLException e) {
                e.printStackTrace();
                resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            }
        } else {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
        }
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        doPost(req, resp);
    }
}
