package com.labsync.backend.service;

import com.labsync.backend.model.ActivityLog;
import com.labsync.backend.repository.ActivityLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ActivityLogService {

    @Autowired
    private ActivityLogRepository repository;

    public List<ActivityLog> getRecent() {
        return repository.findTop500ByOrderByTimestampDesc();
    }

    // Never lets a logging problem break the real action
    public void log(String userId, String details, String ip) {
        try {
            ActivityLog entry = new ActivityLog();
            entry.setUserId(userId == null || userId.isBlank() ? null : userId);
            entry.setActionDetails(details);
            entry.setIpAddress(ip);
            repository.save(entry);
        } catch (Exception e) {
            System.err.println("Could not record activity: " + e.getMessage());
        }
    }
}