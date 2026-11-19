package com.labsync.backend.controller;

import com.labsync.backend.model.Asset;
import com.labsync.backend.service.AssetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/assets")
public class AssetController {

    @Autowired
    private AssetService assetService;

    @GetMapping
    public List<Asset> getAllAssets() {
        return assetService.getAllAssets();
    }

    @PostMapping
    public ResponseEntity<?> createAsset(@RequestBody Asset asset) {
        if (assetService.existsInLab(asset.getLabId(), asset.getComputerNo())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Computer " + asset.getComputerNo() + " already exists in this lab.");
        }
        return ResponseEntity.ok(assetService.createAsset(asset));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Asset> updateAsset(@PathVariable Long id, @RequestBody Asset asset) {
        return ResponseEntity.ok(assetService.updateAsset(id, asset));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteAsset(@PathVariable Long id) {
        try {
            assetService.deleteAsset(id);
            return ResponseEntity.ok("Asset deleted successfully!");
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("This computer cannot be deleted because fault tickets are linked to it.");
        }
    }
}