package com.labsync.backend.repository;

import com.labsync.backend.model.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    // userId වෙනුවට reservedBy භාවිතා කරන්න
    List<Reservation> findByReservedBy(String reservedBy);

    List<Reservation> findByLabId(Long labId);
}