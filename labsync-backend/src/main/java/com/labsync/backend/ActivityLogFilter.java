package com.labsync.backend;

import com.labsync.backend.service.ActivityLogService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class ActivityLogFilter extends OncePerRequestFilter {

    @Autowired
    private ActivityLogService logService;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        chain.doFilter(req, res);

        String method = req.getMethod();
        String path = req.getRequestURI();
        if (!path.startsWith("/api/") || path.startsWith("/api/activity-logs")) return;
        if (method.equals("GET") || method.equals("OPTIONS") || method.equals("HEAD")) return;
        if (res.getStatus() >= 400) return; // only record actions that worked

        String text = describe(method, path);
        if (text != null) {
            logService.log(req.getHeader("X-User-Id"), text, clientIp(req));
        }
    }

    private String describe(String method, String path) {
        String[] p = path.split("/");
        String area = p.length > 2 ? p[2] : "";
        String id = p.length > 3 ? p[3] : "";

        String noun;
        switch (area) {
            case "users":
                if (path.endsWith("/login")) return null;
                noun = "user";
                break;
            case "assets": noun = "computer"; break;
            case "fault-reports":
                noun = "fault ticket";
                if (!id.isEmpty()) id = "TKT-" + id;
                break;
            case "reservations": noun = "reservation"; break;
            case "labs": noun = "lab"; break;
            default: return null;
        }

        String target = noun + (id.isEmpty() ? "" : " " + id);
        if (path.endsWith("/status")) return "Updated status of " + target;

        switch (method) {
            case "POST": return "Created " + (id.isEmpty() ? "a " + noun : target);
            case "PUT": return "Updated " + target;
            case "DELETE": return "Deleted " + target;
            default: return null;
        }
    }

    private String clientIp(HttpServletRequest req) {
        String forwarded = req.getHeader("X-Forwarded-For");
        return forwarded != null && !forwarded.isBlank() ? forwarded.split(",")[0].trim() : req.getRemoteAddr();
    }
}
