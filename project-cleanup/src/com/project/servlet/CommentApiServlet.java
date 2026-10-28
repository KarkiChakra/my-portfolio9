package com.project.servlet;

import com.project.dao.CommentDAO;
import com.project.model.Comment;
import com.project.model.User;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;

@WebServlet("/comment_api")
public class CommentApiServlet extends HttpServlet {
    private CommentDAO commentDAO = new CommentDAO();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        String postIdParam = req.getParameter("postId");
        if (postIdParam == null || postIdParam.isEmpty()) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        try {
            int postId = Integer.parseInt(postIdParam);
            List<Comment> comments = commentDAO.getCommentsByPostId(postId);

            resp.setContentType("application/json");
            resp.setCharacterEncoding("UTF-8");
            PrintWriter out = resp.getWriter();
            out.print(toJson(comments));
            out.flush();
        } catch (NumberFormatException e) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
        }
    }

    private String toJson(List<Comment> comments) {
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < comments.size(); i++) {
            Comment comment = comments.get(i);
            json.append("{");
            json.append("\"id\":").append(comment.getId()).append(",");
            json.append("\"postId\":").append(comment.getPostId()).append(",");
            json.append("\"userId\":").append(comment.getUserId()).append(",");
            json.append("\"username\":\"").append(escapeJson(comment.getUsername())).append("\",");
            json.append("\"content\":\"").append(escapeJson(comment.getContent())).append("\",");
            json.append("\"createdAt\":\"").append(comment.getCreatedAt() != null ? comment.getCreatedAt().toString() : "").append("\",");
            if (comment.getParentCommentId() != null) {
                json.append("\"parentCommentId\":").append(comment.getParentCommentId());
            } else {
                json.append("\"parentCommentId\":null");
            }
            json.append("}");
            if (i < comments.size() - 1) json.append(",");
        }
        json.append("]");
        return json.toString();
    }

    private String escapeJson(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\b", "\\b")
                  .replace("\f", "\\f")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
                  .replace("\t", "\\t");
    }
}
