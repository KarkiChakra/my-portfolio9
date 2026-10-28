package com.project.servlet;

import com.project.dao.UserDAO;
import com.project.dao.PostDAO;
import com.project.model.User;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.io.PrintWriter;

@WebServlet("/profile")
public class ProfileServlet extends HttpServlet {
    private final UserDAO userDAO = new UserDAO();
    private final PostDAO postDAO = new PostDAO();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            resp.sendRedirect("login");
            return;
        }
        User user = (User) session.getAttribute("user");
        req.setAttribute("email", userDAO.getEmailByUserId(user.getId()));
        req.setAttribute("profilePhoto", userDAO.getProfilePhotoPath(user.getId()));
        req.setAttribute("coverPhoto", userDAO.getCoverPhotoPath(user.getId()));
        req.setAttribute("bio", userDAO.getBioByUserId(user.getId()));
        req.setAttribute("posts", postDAO.getPostsByUserId(user.getId()));
        req.getRequestDispatcher("profile.jsp").forward(req, resp);
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            resp.sendRedirect("login");
            return;
        }
        req.setCharacterEncoding("UTF-8");
        User user = (User) session.getAttribute("user");
        String bio = req.getParameter("bio");
        String email = req.getParameter("email");
        String ajax = req.getParameter("ajax");
        boolean isAjax = "1".equals(ajax) || acceptsJson(req);
        boolean updatedSomething = false;
        boolean ok = true;
        String message = null;

        if (bio != null) {
            ok = userDAO.updateBio(user.getId(), bio) && ok;
            updatedSomething = true;
            if (!ok) message = "Bio update failed";
        }

        if (email != null && !email.trim().isEmpty()) {
            boolean emailOk = userDAO.updateEmail(user.getId(), email.trim());
            ok = emailOk && ok;
            updatedSomething = true;
            if (!emailOk) message = "Email update failed";
        }

        if (isAjax) {
            if (!updatedSomething) {
                ok = false;
                message = "Nothing to update";
            }
            resp.setContentType("application/json");
            resp.setCharacterEncoding("UTF-8");
            if (!ok) resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            try (PrintWriter out = resp.getWriter()) {
                out.print("{\"status\":\"" + (ok ? "success" : "error") + "\",\"updated\":" + updatedSomething + ",\"message\":\"" + escapeJson(message) + "\"}");
            }
            return;
        }

        resp.sendRedirect("profile");
    }

    private boolean acceptsJson(HttpServletRequest req) {
        String accept = req.getHeader("Accept");
        if (accept == null) return false;
        return accept.toLowerCase().contains("application/json");
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }
}
