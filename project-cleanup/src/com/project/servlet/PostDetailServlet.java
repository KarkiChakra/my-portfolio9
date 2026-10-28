package com.project.servlet;

import com.project.dao.PostDAO;
import com.project.dao.CommentDAO;
import com.project.model.Post;
import com.project.model.Comment;
import com.project.model.User;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.util.List;

@WebServlet("/post")
public class PostDetailServlet extends HttpServlet {
    private PostDAO postDAO;
    private CommentDAO commentDAO;

    public void init() {
        postDAO = new PostDAO();
        commentDAO = new CommentDAO();
    }

    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            response.sendRedirect("login");
            return;
        }

        String idStr = request.getParameter("id");
        if (idStr == null) {
            response.sendRedirect("posts");
            return;
        }

        int postId;
        try {
            postId = Integer.parseInt(idStr);
        } catch (NumberFormatException e) {
            response.sendRedirect("posts");
            return;
        }
        User user = (User) session.getAttribute("user");
        Post post = postDAO.getPostById(postId, user.getId());
        if (post == null) {
            response.sendRedirect("posts");
            return;
        }

        List<Comment> comments = commentDAO.getCommentsByPostId(postId);

        request.setAttribute("post", post);
        request.setAttribute("comments", comments);
        request.getRequestDispatcher("view_post.jsp").forward(request, response);
    }
}
