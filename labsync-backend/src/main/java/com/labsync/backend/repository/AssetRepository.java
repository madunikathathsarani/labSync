package com.labsync.backend.repository;

import com.labsync.backend.model.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AssetRepository extends JpaRepository<Asset, Long> {
    boolean existsByLabIdAndComputerNo(Long labId, String computerNo);
}