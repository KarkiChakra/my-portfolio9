package com.project.filter;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;

@WebFilter("/*")
public class SecurityHeadersFilter implements Filter {
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        if (request instanceof HttpServletRequest && response instanceof HttpServletResponse) {
            HttpServletRequest req = (HttpServletRequest) request;
            HttpServletResponse resp = (HttpServletResponse) response;
            resp.setHeader("X-Content-Type-Options", "nosniff");
            resp.setHeader("X-Frame-Options", "DENY");
            resp.setHeader("Referrer-Policy", "no-referrer");
            resp.setHeader("X-XSS-Protection", "0");
            resp.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
            resp.setHeader("Content-Security-Policy", "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://cdn.jsdelivr.net");
            resp.setHeader("Cache-Control", "no-store");

            if (isUnsafeMethod(req.getMethod()) && !isSameOrigin(req)) {
                resp.sendError(HttpServletResponse.SC_FORBIDDEN);
                return;
            }
        }
        chain.doFilter(request, response);
    }

    private boolean isUnsafeMethod(String method) {
        return !("GET".equals(method) || "HEAD".equals(method) || "OPTIONS".equals(method));
    }

    private boolean isSameOrigin(HttpServletRequest req) {
        String origin = req.getHeader("Origin");
        if (origin == null || origin.isBlank()) return true;
        String expected = req.getScheme() + "://" + req.getServerName();
        int port = req.getServerPort();
        if (!(port == 80 && "http".equals(req.getScheme())) && !(port == 443 && "https".equals(req.getScheme()))) {
            expected += ":" + port;
        }
        return expected.equalsIgnoreCase(origin);
    }
}
