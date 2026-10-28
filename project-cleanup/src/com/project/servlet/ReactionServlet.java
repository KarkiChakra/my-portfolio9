package com.project.servlet;

import com.project.dao.ReactionDAO;
import com.project.model.User;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.SQLException;

@WebServlet("/reaction")
public class ReactionServlet extends HttpServlet {
    private ReactionDAO reactionDAO = new ReactionDAO();

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        request.setCharacterEncoding("UTF-8");
        String postIdStr = request.getParameter("postId");
        if (postIdStr == null) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        try {
            int postId = Integer.parseInt(postIdStr);
            int count = reactionDAO.getReactionUserCount(postId, ReactionDAO.TargetType.POST);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            PrintWriter out = response.getWriter();
            out.print("{\"count\":" + count + "}");
            out.flush();
        } catch (NumberFormatException | SQLException e) {
            e.printStackTrace();
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        request.setCharacterEncoding("UTF-8");
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        User user = (User) session.getAttribute("user");
        request.setCharacterEncoding("UTF-8");
        String targetIdStr = request.getParameter("postId"); // Keeping 'postId' for compatibility with posts
        if (targetIdStr == null) targetIdStr = request.getParameter("messageId"); // For chat reactions
        
        String reaction = request.getParameter("type"); // Keeping 'type' for compatibility with posts
        if (reaction == null) reaction = request.getParameter("reaction"); // For chat reactions
        
        String targetTypeStr = request.getParameter("targetType");
        String redirect = request.getParameter("redirect");
        if (targetTypeStr != null) targetTypeStr = targetTypeStr.trim().toUpperCase();

        if (targetIdStr != null && reaction != null && !reaction.isEmpty()) {
            try {
                int targetId = Integer.parseInt(targetIdStr);
                ReactionDAO.TargetType targetType = ReactionDAO.TargetType.POST; // Default
                
                if ("CHAT".equals(targetTypeStr)) {
                    targetType = ReactionDAO.TargetType.CHAT;
                } else if ("PRIVATE_CHAT".equals(targetTypeStr)) {
                    targetType = ReactionDAO.TargetType.PRIVATE_CHAT;
                }
                
                String status = reactionDAO.toggleReaction(user.getId(), targetId, reaction, targetType);
                
                if (redirect != null && !redirect.isEmpty()) {
                    response.sendRedirect(redirect);
                } else {
                    response.setContentType("application/json");
                    response.setCharacterEncoding("UTF-8");
                    PrintWriter out = response.getWriter();
                    out.print("{\"status\":\"" + status + "\"}");
                    out.flush();
                }
            } catch (NumberFormatException | SQLException e) {
                e.printStackTrace();
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            }
        } else {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
        }
    }
}
