package com.labsync.backend.controller;

import com.labsync.backend.model.FaultReport;
import com.labsync.backend.service.FaultReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/fault-reports")
public class FaultReportController {

    @Autowired
    private FaultReportService faultReportService;

    @GetMapping
    public List<FaultReport> getAllReports() {
        return faultReportService.getAllReports();
    }

    @PostMapping
    public FaultReport createReport(@RequestBody FaultReport report) {
        return faultReportService.createReport(report);
    }

    // Updated: Now accepts PUT /api/fault-reports/{id} with JSON body {"status": "Resolved"}
    @PutMapping("/{id}/status")
    public ResponseEntity<FaultReport> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null) {
            status = "Resolved"; // Default fallback
        }
        return ResponseEntity.ok(faultReportService.updateReportStatus(id, status));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteReport(@PathVariable Long id) {
        faultReportService.deleteReport(id);
        return ResponseEntity.ok("Fault report deleted successfully!");
    }
}