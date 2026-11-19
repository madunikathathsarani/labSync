package com.labsync.backend.service;

import com.labsync.backend.model.FaultReport;
import com.labsync.backend.model.User;
import com.labsync.backend.repository.FaultReportRepository;
import com.labsync.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FaultReportService {

    @Autowired private FaultReportRepository faultReportRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private EmailService emailService;

    public List<FaultReport> getAllReports() {
        List<FaultReport> reports = faultReportRepository.findAll();
        reports.forEach(this::fillReporter);
        return reports;
    }

    // Ticket created -> email all technicians
    public FaultReport createReport(FaultReport report) {
        normalizeFaultType(report);

        FaultReport saved = faultReportRepository.save(report);
        fillReporter(saved);

        try {
            String[] technicianEmails = userRepository.findByRoleIgnoreCase("Technician").stream()
                    .map(User::getEmail)
                    .filter(e -> e != null && !e.isBlank())
                    .toArray(String[]::new);

            if (technicianEmails.length > 0) {
                String itemLine = isEquipment(saved)
                        ? "Equipment: " + saved.getEquipmentType() + "\n"
                        : "Computer (asset) ID: " + saved.getAssetID() + "\n";

                emailService.send(technicianEmails,
                        "New fault ticket TKT-" + saved.getReportID(),
                        "A new fault ticket has been reported.\n\n"
                                + "Ticket: TKT-" + saved.getReportID() + "\n"
                                + "Reported by: " + saved.getReportedBy() + "\n"
                                + "Lab ID: " + saved.getLabID() + "\n"
                                + itemLine
                                + "Priority: " + saved.getPriority() + "\n\n"
                                + "Issue: " + saved.getIssueDescription() + "\n\n"
                                + "Please log in to LabSync to handle this ticket.");
            } else {
                System.out.println("⚠ No technician email found. Check role = Technician and email is filled.");
            }
        } catch (Exception e) {
            System.err.println("Could not send technician email: " + e.getMessage());
        }
        return saved;
    }

    // Status changed -> if it became Resolved, email the person who reported it
    public FaultReport updateReportStatus(Long id, String status) {
        FaultReport report = faultReportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Fault report not found: " + id));

        String oldStatus = report.getStatus();
        report.setStatus(status);
        FaultReport saved = faultReportRepository.save(report);
        fillReporter(saved);

        boolean justResolved = "Resolved".equalsIgnoreCase(status) && !"Resolved".equalsIgnoreCase(oldStatus);
        try {
            if (justResolved && saved.getReporterEmail() != null && !saved.getReporterEmail().isBlank()) {
                String itemText = isEquipment(saved)
                        ? "Equipment: " + saved.getEquipmentType() + "\n"
                        : "";

                emailService.send(new String[]{ saved.getReporterEmail() },
                        "Your fault ticket TKT-" + saved.getReportID() + " has been resolved",
                        "Hello " + saved.getReportedBy() + ",\n\n"
                                + "Your fault ticket TKT-" + saved.getReportID() + " has been marked as resolved.\n\n"
                                + itemText
                                + "Issue: " + saved.getIssueDescription() + "\n\n"
                                + "Thank you,\nLabSync - Department of Information Technology");
            }
        } catch (Exception e) {
            System.err.println("Could not send resolved email: " + e.getMessage());
        }
        return saved;
    }

    public void deleteReport(Long id) {
        faultReportRepository.deleteById(id);
    }

    /* ---------- Helpers ---------- */

    private boolean isEquipment(FaultReport r) {
        return "equipment".equalsIgnoreCase(r.getFaultType());
    }

    // Makes sure the fault type, asset and equipment fields agree with each other
    private void normalizeFaultType(FaultReport report) {
        String type = report.getFaultType();
        if (type == null || type.isBlank()) {
            type = "computer";
        }
        type = type.trim().toLowerCase();
        report.setFaultType(type);

        if ("equipment".equals(type)) {
            if (report.getEquipmentType() == null || report.getEquipmentType().isBlank()) {
                throw new IllegalArgumentException("Equipment type is required for an equipment fault.");
            }
            report.setAssetID(null); // lab-level fault, not linked to a PC
        } else {
            if (report.getAssetID() == null) {
                throw new IllegalArgumentException("Computer (asset) is required for a computer fault.");
            }
            report.setEquipmentType(null);
        }
    }

    // Finds the name and email of the person who made the ticket, using the saved userID
    private void fillReporter(FaultReport report) {
        try {
            if (report.getUserID() == null) return;
            userRepository.findByUserId(report.getUserID()).ifPresent(u -> {
                report.setReportedBy(u.getName());
                report.setReporterEmail(u.getEmail());
            });
        } catch (Exception e) {
            System.err.println("Could not load reporter: " + e.getMessage());
        }
    }
}