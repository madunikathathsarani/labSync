package com.labsync.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "fault_report")
public class FaultReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reportID")
    private Long reportID;

    @Column(name = "labID", nullable = false)
    private Long labID;

    @Column(name = "assetID")
    private Long assetID;

    @Column(name = "userID")
    private String userID;

    @Column(name = "issueDescription")
    private String issueDescription;

    @Column(name = "priority")
    private String priority;

    @Column(name = "status")
    private String status = "Pending Repair";

    @Column(name = "reportDate", updatable = false)
    private LocalDateTime reportDate;

    @Column(name = "faultType")
    private String faultType = "computer";

    @Column(name = "equipmentType")
    private String equipmentType;

    // NEW: filled by the backend, NOT stored in the database
    @Transient
    private String reportedBy;

    @Transient
    private String reporterEmail;

    public FaultReport() {}

    @PrePersist
    protected void onCreate() {
        if (this.reportDate == null) {
            this.reportDate = LocalDateTime.now();
        }
    }

    public Long getReportID() { return reportID; }
    public void setReportID(Long reportID) { this.reportID = reportID; }

    public Long getLabID() { return labID; }
    public void setLabID(Long labID) { this.labID = labID; }

    public Long getAssetID() { return assetID; }
    public void setAssetID(Long assetID) { this.assetID = assetID; }

    public String getUserID() { return userID; }
    public void setUserID(String userID) { this.userID = userID; }

    public String getIssueDescription() { return issueDescription; }
    public void setIssueDescription(String issueDescription) { this.issueDescription = issueDescription; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getReportDate() { return reportDate; }
    public void setReportDate(LocalDateTime reportDate) { this.reportDate = reportDate; }

    public String getFaultType() { return faultType; }
    public void setFaultType(String faultType) { this.faultType = faultType; }

    public String getEquipmentType() { return equipmentType; }
    public void setEquipmentType(String equipmentType) { this.equipmentType = equipmentType; }

    // NEW
    public String getReportedBy() { return reportedBy; }
    public void setReportedBy(String reportedBy) { this.reportedBy = reportedBy; }

    @JsonIgnore
    public String getReporterEmail() { return reporterEmail; }
    public void setReporterEmail(String reporterEmail) { this.reporterEmail = reporterEmail; }
}