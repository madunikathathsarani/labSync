package com.labsync.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "activity_log")
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "logID")
    private Long logId;

    @Column(name = "userID")
    private String userId;

    @Column(name = "actionDetails", columnDefinition = "TEXT")
    private String actionDetails;

    @Column(name = "timestamp")
    private LocalDateTime timestamp;

    @Column(name = "ipAddress")
    private String ipAddress;

    public ActivityLog() {}

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) timestamp = LocalDateTime.now();
    }

    public Long getLogId() { return logId; }
    public void setLogId(Long logId) { this.logId = logId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getActionDetails() { return actionDetails; }
    public void setActionDetails(String actionDetails) { this.actionDetails = actionDetails; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
}
