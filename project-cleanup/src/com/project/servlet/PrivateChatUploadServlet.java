package com.project.servlet;

import com.project.dao.PrivateMessageDAO;
import com.project.model.User;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.servlet.http.Part;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

@WebServlet("/private_chat_upload")
@MultipartConfig(fileSizeThreshold = 1024 * 1024, maxFileSize = 1024 * 1024 * 10, maxRequestSize = 1024 * 1024 * 15)
public class PrivateChatUploadServlet extends HttpServlet {
    private PrivateMessageDAO privateMessageDAO = new PrivateMessageDAO();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        User user = (User) session.getAttribute("user");
        req.setCharacterEncoding("UTF-8");
        
        String receiverIdParam = null;
        String content = null;
        String imagePath = null;
        
        String contentType = req.getContentType();
        if (contentType != null && contentType.toLowerCase().startsWith("multipart/")) {
            // Multipart
            try {
                receiverIdParam = req.getParameter("receiverId"); // getParameter works for parts in Tomcat if MultipartConfig present
                Part contentPart = req.getPart("content");
                if (contentPart != null) {
                    content = new String(contentPart.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                }
                
                Part imagePart = req.getPart("image");
                if (imagePart != null && imagePart.getSize() > 0 && imagePart.getSubmittedFileName() != null && !imagePart.getSubmittedFileName().isEmpty()) {
                    String fileName = UUID.randomUUID().toString();
                    String submittedName = imagePart.getSubmittedFileName().toLowerCase();
                    if (submittedName.endsWith(".png")) fileName += ".png";
                    else if (submittedName.endsWith(".gif")) fileName += ".gif";
                    else if (submittedName.endsWith(".webp")) fileName += ".webp";
                    else fileName += ".jpg";
                    
                    String uploadDir = getServletContext().getRealPath("") + File.separator + "uploads";
                    File dir = new File(uploadDir);
                    if (!dir.exists()) dir.mkdirs();
                    
                    File file = new File(dir, fileName);
                    imagePart.write(file.getAbsolutePath());
                    imagePath = "uploads/" + fileName;
                }
            } catch (Exception e) {
                e.printStackTrace();
                resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                resp.getWriter().print("{\"status\":\"error\", \"message\":\"Multipart upload failed: " + e.getMessage() + "\"}");
                return;
            }
        } else {
            // Legacy Base64
            receiverIdParam = req.getParameter("receiverId");
            content = req.getParameter("content");
            String imageBase64 = req.getParameter("image");
            
            if (imageBase64 != null && !imageBase64.isEmpty()) {
                try {
                    String[] parts = imageBase64.split(",");
                    String header = parts.length > 1 ? parts[0] : "";
                    if (!isAllowedDataUrlHeader(header)) {
                        resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                        resp.getWriter().print("{\"status\":\"error\", \"message\":\"Invalid image type\"}");
                        return;
                    }

                    String base64Data = parts.length > 1 ? parts[1] : parts[0];
                    byte[] imageBytes = Base64.getDecoder().decode(base64Data);

                    String fileName = UUID.randomUUID().toString() + ".jpg";
                    if (header.contains("image/png")) fileName = UUID.randomUUID().toString() + ".png";
                    else if (header.contains("image/gif")) fileName = UUID.randomUUID().toString() + ".gif";
                    else if (header.contains("image/webp")) fileName = UUID.randomUUID().toString() + ".webp";

                    String uploadDir = getServletContext().getRealPath("") + File.separator + "uploads";
                    File dir = new File(uploadDir);
                    if (!dir.exists()) dir.mkdirs();

                    File file = new File(dir, fileName);
                    try (FileOutputStream fos = new FileOutputStream(file)) {
                        fos.write(imageBytes);
                    }
                    imagePath = "uploads/" + fileName;
                } catch (Exception e) {
                    e.printStackTrace();
                    resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                    resp.getWriter().print("{\"status\":\"error\", \"message\":\"Base64 upload failed\"}");
                    return;
                }
            }
        }

        if (receiverIdParam == null || receiverIdParam.isEmpty()) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        int receiverId;
        try {
            receiverId = Integer.parseInt(receiverIdParam);
        } catch (NumberFormatException e) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        if ((content == null || content.trim().isEmpty()) && imagePath == null) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().print("{\"status\":\"error\", \"message\":\"Empty content\"}");
            return;
        }

        try {
            privateMessageDAO.addPrivateMessage(user.getId(), receiverId, content != null ? content : "", imagePath);
            resp.setContentType("application/json");
            resp.setCharacterEncoding("UTF-8");
            resp.getWriter().print("{\"status\":\"success\"}");
        } catch (Exception e) {
            e.printStackTrace();
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            String errorMsg = e.getMessage() != null ? e.getMessage().replace("\"", "'").replace("\n", " ") : "Unknown error";
            resp.getWriter().print("{\"status\":\"error\", \"message\":\"Database error: " + errorMsg + "\"}");
        }
    }

    private boolean isAllowedDataUrlHeader(String header) {
        if (header == null) return false;
        String lower = header.toLowerCase();
        return lower.startsWith("data:image/jpeg")
                || lower.startsWith("data:image/jpg")
                || lower.startsWith("data:image/png")
                || lower.startsWith("data:image/gif")
                || lower.startsWith("data:image/webp");
    }
}
