package com.project.servlet;

import com.project.dao.UserDAO;
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
import java.io.IOException;
import java.util.UUID;

@WebServlet("/upload_profile")
@MultipartConfig(fileSizeThreshold = 1024 * 1024, maxFileSize = 5 * 1024 * 1024, maxRequestSize = 6 * 1024 * 1024)
public class ProfileUploadServlet extends HttpServlet {
    private final UserDAO userDAO = new UserDAO();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        User user = (User) session.getAttribute("user");
        Part part = req.getPart("photo");
        if (part == null || part.getSize() == 0) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().print("{\"status\":\"error\",\"message\":\"No file uploaded\"}");
            return;
        }
        String submitted = part.getSubmittedFileName().toLowerCase();
        String ext = ".jpg";
        if (submitted.endsWith(".png")) ext = ".png";
        else if (submitted.endsWith(".gif")) ext = ".gif";
        else if (submitted.endsWith(".webp")) ext = ".webp";

        String fileName = "pf_" + UUID.randomUUID() + ext;
        String baseDir = getServletContext().getRealPath("") + File.separator + "uploads" + File.separator + "profile";
        File dir = new File(baseDir);
        if (!dir.exists()) dir.mkdirs();
        File out = new File(dir, fileName);
        part.write(out.getAbsolutePath());

        String relativePath = "uploads/profile/" + fileName;
        boolean ok = userDAO.updateProfilePhotoPath(user.getId(), relativePath);
        
        if (ok) {
            user.setProfilePhoto(relativePath);
            session.setAttribute("user", user); // Update session
            resp.setContentType("application/json");
            resp.setCharacterEncoding("UTF-8");
            resp.getWriter().print("{\"status\":\"success\",\"path\":\"" + relativePath.replace("\"","") + "\"}");
        } else {
            resp.setContentType("application/json");
            resp.setCharacterEncoding("UTF-8");
            resp.getWriter().print("{\"status\":\"error\",\"message\":\"Failed to save path\"}");
        }
    }
}

