package com.labsync.backend.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "reservation")
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reservation_id")
    private Long reservationId;

    @Column(name = "reserved_by")
    private String reservedBy;

    @Column(name = "lab_id")
    private Long labId;

    @Column(name = "reservation_date")
    private LocalDate reservationDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "purpose", columnDefinition = "TEXT")
    private String purpose;

    @Column(name = "status")
    private String status = "Pending";

    public Reservation() {}

    public Reservation(String reservedBy, Long labId, LocalDate reservationDate, LocalTime startTime, LocalTime endTime, String purpose, String status) {
        this.reservedBy = reservedBy;
        this.labId = labId;
        this.reservationDate = reservationDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.purpose = purpose;
        this.status = status;
    }

    public Long getReservationId() { return reservationId; }
    public void setReservationId(Long reservationId) { this.reservationId = reservationId; }

    public String getReservedBy() { return reservedBy; }
    public void setReservedBy(String reservedBy) { this.reservedBy = reservedBy; }

    public Long getLabId() { return labId; }
    public void setLabId(Long labId) { this.labId = labId; }

    public LocalDate getReservationDate() { return reservationDate; }
    public void setReservationDate(LocalDate reservationDate) { this.reservationDate = reservationDate; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}