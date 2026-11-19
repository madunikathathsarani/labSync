package com.labsync.backend.controller;

import com.labsync.backend.model.ActivityLog;
import com.labsync.backend.service.ActivityLogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/activity-logs")
public class ActivityLogController {

    @Autowired
    private ActivityLogService service;

    @GetMapping
    public List<ActivityLog> getLogs() {
        return service.getRecent();
    }

    // The website uses this to report events the server cannot see, like sign-in and sign-out
    @PostMapping
    public ResponseEntity<Void> record(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String details = body.get("actionDetails");
        if (details == null || details.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        String ip = forwarded != null && !forwarded.isBlank()
                ? forwarded.split(",")[0].trim()
                : request.getRemoteAddr();
        service.log(body.get("userId"), details, ip);
        return ResponseEntity.ok().build();
    }
}