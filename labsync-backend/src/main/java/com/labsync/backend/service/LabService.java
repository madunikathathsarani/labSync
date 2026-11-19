package com.labsync.backend.service;

import com.labsync.backend.model.Lab;
import com.labsync.backend.repository.LabRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LabService {

    @Autowired
    private LabRepository labRepository;

    public List<Lab> getAllLabs() {
        return labRepository.findAll();
    }

    public Lab createLab(Lab lab) {
        return labRepository.save(lab);
    }

    public Lab updateLab(Long id, Lab updatedLab) {
        return labRepository.findById(id).map(lab -> {
            lab.setLabName(updatedLab.getLabName()); // setLab_name වෙනුවට setLabName
            lab.setLocation(updatedLab.getLocation());
            lab.setCapacity(updatedLab.getCapacity());
            return labRepository.save(lab);
        }).orElseThrow(() -> new RuntimeException("Lab not found with id " + id));
    }

    public void deleteLab(Long id) {
        labRepository.deleteById(id);
    }
}