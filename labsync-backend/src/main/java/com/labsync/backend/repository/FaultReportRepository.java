package com.labsync.backend.repository;

import com.labsync.backend.model.FaultReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FaultReportRepository extends JpaRepository<FaultReport, Long> {
    List<FaultReport> findByStatus(String status);

    // ⚠️ FIXED: Changed findByAssetId -> findByAssetID to match field name 'assetID'
    List<FaultReport> findByAssetID(Long assetID);
}