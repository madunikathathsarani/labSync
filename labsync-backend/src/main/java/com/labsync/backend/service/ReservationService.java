package com.labsync.backend.service;

import com.labsync.backend.model.Reservation;
import com.labsync.backend.repository.ReservationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ReservationService {

    @Autowired
    private ReservationRepository reservationRepository;

    public List<Reservation> getAllReservations() {
        return reservationRepository.findAll();
    }

    public Reservation createReservation(Reservation reservation) {
        // Default status එක "Pending" ලෙස set කිරීම (Entity එකට ගැලපෙන සේ)
        if (reservation.getStatus() == null || reservation.getStatus().trim().isEmpty()) {
            reservation.setStatus("Pending");
        }
        return reservationRepository.save(reservation);
    }

    public Reservation updateReservationStatus(Long id, String status) {
        return reservationRepository.findById(id).map(res -> {
            res.setStatus(status);
            return reservationRepository.save(res);
        }).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found with id: " + id));
    }

    public void deleteReservation(Long id) {
        if (!reservationRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found with id: " + id);
        }
        reservationRepository.deleteById(id);
    }
}