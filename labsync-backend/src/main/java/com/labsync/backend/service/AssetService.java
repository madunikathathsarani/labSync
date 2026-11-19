package com.labsync.backend.service;

import com.labsync.backend.model.Asset;
import com.labsync.backend.repository.AssetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AssetService {

    @Autowired
    private AssetRepository assetRepository;

    public List<Asset> getAllAssets() {
        return assetRepository.findAll();
    }

    public boolean existsInLab(Long labId, String computerNo) {
        return assetRepository.existsByLabIdAndComputerNo(labId, computerNo);
    }

    public Asset createAsset(Asset asset) {
        return assetRepository.save(asset);
    }

    public Asset updateAsset(Long id, Asset a) {
        return assetRepository.findById(id).map(asset -> {
            asset.setComputerNo(a.getComputerNo());
            asset.setAssetTag(a.getAssetTag());
            asset.setSpecificationDetails(a.getSpecificationDetails());
            asset.setInstalledSoftwares(a.getInstalledSoftwares());
            asset.setRequiredSoftwares(a.getRequiredSoftwares());
            if (a.getLabId() != null) asset.setLabId(a.getLabId());
            if (a.getStatus() != null) asset.setStatus(a.getStatus());
            return assetRepository.save(asset);
        }).orElseThrow(() -> new RuntimeException("Asset not found with id " + id));
    }

    public void deleteAsset(Long id) {
        assetRepository.deleteById(id);
    }
}