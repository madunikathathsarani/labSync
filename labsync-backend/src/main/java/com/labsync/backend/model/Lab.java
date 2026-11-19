package com.labsync.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "lab")
public class Lab {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "labID") // DB එකේ තිබුණේ labID නම් මෙතන labID විය යුතුයි
    private Long labId;

    @Column(name = "labName", nullable = false) // lab_name වෙනුවට labName
    private String labName;

    @Column(name = "capacity", nullable = false)
    private Integer capacity;

    @Column(name = "location", nullable = false)
    private String location;

    public Lab() {}

    public Long getLabId() { return labId; }
    public void setLabId(Long labId) { this.labId = labId; }

    public String getLabName() { return labName; }
    public void setLabName(String labName) { this.labName = labName; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
}