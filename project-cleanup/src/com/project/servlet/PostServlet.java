package com.project.servlet;

import com.project.dao.PostDAO;
import com.project.model.Post;
import com.project.model.User;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.servlet.http.Part;

import java.io.File;
import java.io.IOException;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

@WebServlet("/posts")
@MultipartConfig(
    fileSizeThreshold = 1024 * 1024 * 1, // 1 MB
    maxFileSize = 1024 * 1024 * 10,      // 10 MB
    maxRequestSize = 1024 * 1024 * 100   // 100 MB
)
public class PostServlet extends HttpServlet {
    private PostDAO postDAO;

    public void init() {
        postDAO = new PostDAO();
    }

    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            response.sendRedirect("login");
            return;
        }

        User user = (User) session.getAttribute("user");
        List<Post> posts = postDAO.getAllPosts(user.getId());
        request.setAttribute("posts", posts);
        request.getRequestDispatcher("dashboard.jsp").forward(request, response);
    }

    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            response.sendRedirect("login");
            return;
        }

        User user = (User) session.getAttribute("user");
        String action = request.getParameter("action");
        String redirect = request.getParameter("redirect");

        if ("delete".equals(action)) {
            String postIdStr = request.getParameter("postId");
            if (postIdStr != null) {
                try {
                    int postId = Integer.parseInt(postIdStr);
                    postDAO.deletePost(postId, user.getId());
                } catch (NumberFormatException | SQLException e) {
                    throw new ServletException("Error deleting post", e);
                }
            }
            if (redirect != null && !redirect.isEmpty()) {
                response.sendRedirect(redirect);
                return;
            }
        } else {
            String title = request.getParameter("title");
            String content = request.getParameter("content");
            String imagePath = null;

            try {
                Part filePart = request.getPart("image");
                if (filePart != null && filePart.getSize() > 0) {
                    String contentType = filePart.getContentType();
                    if (isAllowedImageType(contentType)) {
                        String fileName = java.nio.file.Paths.get(filePart.getSubmittedFileName()).getFileName().toString();
                        String safeFileName = fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
                        if (isAllowedImageName(safeFileName)) {
                            String uniqueFileName = UUID.randomUUID().toString() + "_" + safeFileName;

                            String uploadDir = getServletContext().getRealPath("") + File.separator + "uploads";
                            File uploadDirFile = new File(uploadDir);
                            if (!uploadDirFile.exists()) {
                                uploadDirFile.mkdirs();
                            }

                            // Write to current deployment
                            String filePath = uploadDir + File.separator + uniqueFileName;
                            filePart.write(filePath);
                            
                            imagePath = "uploads/" + uniqueFileName;
                        }
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }

            Post post = new Post();
            post.setUserId(user.getId());
            post.setTitle(title);
            post.setContent(content);
            post.setImagePath(imagePath);

            try {
                postDAO.createPost(post);
            } catch (SQLException e) {
                throw new ServletException("Error creating post", e);
            }
        }

        response.sendRedirect("posts");
    }

    private boolean isAllowedImageType(String contentType) {
        if (contentType == null) return false;
        return contentType.equalsIgnoreCase("image/jpeg")
                || contentType.equalsIgnoreCase("image/jpg")
                || contentType.equalsIgnoreCase("image/png")
                || contentType.equalsIgnoreCase("image/gif");
    }

    private boolean isAllowedImageName(String fileName) {
        if (fileName == null) return false;
        String lower = fileName.toLowerCase();
        return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".gif");
    }
}
