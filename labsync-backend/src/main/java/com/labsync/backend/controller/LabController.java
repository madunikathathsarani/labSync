package com.labsync.backend.controller;

import com.labsync.backend.model.Lab;
import com.labsync.backend.service.LabService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
@RestController
@RequestMapping("/api/labs")
public class LabController {

    @Autowired
    private LabService labService;

    @GetMapping
    public List<Lab> getAllLabs() {
        return labService.getAllLabs();
    }

    @PostMapping
    public Lab createLab(@RequestBody Lab lab) {
        return labService.createLab(lab); // saveLab වෙනුවට createLab යොදන්න
    }

    @PutMapping("/{id}")
    public ResponseEntity<Lab> updateLab(@PathVariable Long id, @RequestBody Lab lab) {
        return ResponseEntity.ok(labService.updateLab(id, lab));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteLab(@PathVariable Long id) {
        labService.deleteLab(id);
        return ResponseEntity.ok("Lab deleted successfully!");
    }
}