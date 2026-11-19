package com.labsync.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "asset")
public class Asset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "assetID")
    private Long assetId;

    @Column(name = "labID", nullable = false)
    private Long labId;

    @Column(name = "ComputerNo", nullable = false, length = 50)
    private String computerNo;

    @Column(name = "assetTag")
    private String assetTag;

    @Column(name = "specificationDetails", nullable = false, columnDefinition = "TEXT")
    private String specificationDetails;

    @Column(name = "installedSoftware", columnDefinition = "TEXT")
    private String installedSoftwares;

    @Column(name = "requiredSoftwares", columnDefinition = "TEXT")
    private String requiredSoftwares;

    @Column(name = "status")
    private String status = "Working";

    public Asset() {}

    public Long getAssetId() { return assetId; }
    public void setAssetId(Long assetId) { this.assetId = assetId; }

    public Long getLabId() { return labId; }
    public void setLabId(Long labId) { this.labId = labId; }

    public String getComputerNo() { return computerNo; }
    public void setComputerNo(String computerNo) { this.computerNo = computerNo; }

    public String getAssetTag() { return assetTag; }
    public void setAssetTag(String assetTag) { this.assetTag = assetTag; }

    public String getSpecificationDetails() { return specificationDetails; }
    public void setSpecificationDetails(String specificationDetails) { this.specificationDetails = specificationDetails; }

    public String getInstalledSoftwares() { return installedSoftwares; }
    public void setInstalledSoftwares(String installedSoftwares) { this.installedSoftwares = installedSoftwares; }

    public String getRequiredSoftwares() { return requiredSoftwares; }
    public void setRequiredSoftwares(String requiredSoftwares) { this.requiredSoftwares = requiredSoftwares; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}