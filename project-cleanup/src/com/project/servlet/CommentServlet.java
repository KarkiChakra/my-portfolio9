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
import java.sql.SQLException;

@WebServlet("/comment")
public class CommentServlet extends HttpServlet {
    private CommentDAO commentDAO;

    public void init() {
        commentDAO = new CommentDAO();
    }

    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            response.sendRedirect("login");
            return;
        }

        User user = (User) session.getAttribute("user");
        String postIdStr = request.getParameter("postId");
        String content = request.getParameter("content");
        String parentIdStr = request.getParameter("parentCommentId");

        if (postIdStr == null || content == null) {
            response.sendRedirect("posts");
            return;
        }

        int postId = Integer.parseInt(postIdStr);
        Integer parentId = null;
        if (parentIdStr != null && !parentIdStr.isEmpty()) {
            parentId = Integer.parseInt(parentIdStr);
        }

        Comment comment = new Comment();
        comment.setPostId(postId);
        comment.setUserId(user.getId());
        comment.setContent(content);
        comment.setParentCommentId(parentId);

        try {
            commentDAO.createComment(comment);
        } catch (SQLException e) {
            if (e.getErrorCode() == 2291) {
                // Parent key not found (Post likely deleted)
                response.sendRedirect("posts");
                return;
            }
            throw new ServletException("Error creating comment", e);
        }

        response.sendRedirect("post?id=" + postId);
    }
}
