package com.project.servlet;

import com.project.dao.PrivateMessageDAO;
import com.project.model.PrivateMessage;
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

@WebServlet("/private_chat_api")
public class PrivateChatServlet extends HttpServlet {
    private PrivateMessageDAO privateMessageDAO = new PrivateMessageDAO();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        User user = (User) session.getAttribute("user");
        String otherUserIdParam = req.getParameter("userId");
        String lastIdParam = req.getParameter("lastId");

        if (otherUserIdParam == null || otherUserIdParam.isEmpty()) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        int otherUserId;
        try {
            otherUserId = Integer.parseInt(otherUserIdParam);
        } catch (NumberFormatException e) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        int lastId = 0;
        if (lastIdParam != null && !lastIdParam.isEmpty()) {
            try {
                lastId = Integer.parseInt(lastIdParam);
            } catch (NumberFormatException e) {
                // Ignore invalid lastId
            }
        }

        List<PrivateMessage> messages = privateMessageDAO.getPrivateMessages(user.getId(), otherUserId, lastId);

        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter out = resp.getWriter();
        out.print(toJson(messages));
        out.flush();
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        User user = (User) session.getAttribute("user");
        req.setCharacterEncoding("UTF-8");
        
        String receiverIdParam = req.getParameter("receiverId");
        String content = req.getParameter("content");
        String imagePath = req.getParameter("imagePath"); // Optional, for uploads

        if (receiverIdParam == null || content == null) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        try {
            int receiverId = Integer.parseInt(receiverIdParam);
            privateMessageDAO.addPrivateMessage(user.getId(), receiverId, content, imagePath);
            
            resp.setContentType("application/json");
            resp.setCharacterEncoding("UTF-8");
            resp.getWriter().print("{\"status\":\"success\"}");
        } catch (NumberFormatException e) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
        } catch (Exception e) {
            e.printStackTrace();
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().print("{\"status\":\"error\", \"message\":\"" + e.getMessage() + "\"}");
        }
    }

    private String toJson(List<PrivateMessage> messages) {
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < messages.size(); i++) {
            PrivateMessage msg = messages.get(i);
            json.append("{");
            json.append("\"id\":").append(msg.getId()).append(",");
            json.append("\"senderId\":").append(msg.getSenderId()).append(",");
            json.append("\"username\":\"").append(escapeJson(msg.getUsername())).append("\",");
            json.append("\"content\":\"").append(escapeJson(msg.getContent())).append("\",");
            json.append("\"imagePath\":\"").append(escapeJson(msg.getImagePath())).append("\",");
            json.append("\"createdAt\":\"").append(msg.getCreatedAt() != null ? msg.getCreatedAt().toString() : "").append("\",");
            
            json.append("\"reactions\":[");
            if (msg.getReactions() != null) {
                for (int j = 0; j < msg.getReactions().size(); j++) {
                    java.util.Map<String, Object> reaction = msg.getReactions().get(j);
                    json.append("{");
                    json.append("\"emoji\":\"").append(escapeJson((String) reaction.get("emoji"))).append("\",");
                    json.append("\"count\":").append(reaction.get("count")).append(",");
                    json.append("\"userReacted\":").append(reaction.get("userReacted"));
                    json.append("}");
                    if (j < msg.getReactions().size() - 1) json.append(",");
                }
            }
            json.append("]");
            
            json.append("}");
            if (i < messages.size() - 1) json.append(",");
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
