package com.labsync.backend.controller;

import com.labsync.backend.model.Reservation;
import com.labsync.backend.service.ReservationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"}) // 3000 සහ 3001 දෙකටම Permission දුන්නා
@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    @Autowired
    private ReservationService reservationService;

    @GetMapping
    public List<Reservation> getAllReservations() {
        return reservationService.getAllReservations();
    }

    @PostMapping
    public Reservation createReservation(@RequestBody Reservation reservation) {
        return reservationService.createReservation(reservation);
    }

    // Query Parameter එකෙන් සහ Request Body එකෙන් දෙකෙන්ම Status update කරන්න පුළුවන් වෙන ලෙස:
    @PutMapping("/{id}/status")
    public ResponseEntity<Reservation> updateStatus(
            @PathVariable Long id,
            @RequestParam(required = false) String status,
            @RequestBody(required = false) java.util.Map<String, String> body) {

        String newStatus = status;
        if (newStatus == null && body != null) {
            newStatus = body.get("status");
        }

        return ResponseEntity.ok(reservationService.updateReservationStatus(id, newStatus));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteReservation(@PathVariable Long id) {
        reservationService.deleteReservation(id);
        return ResponseEntity.ok("Reservation deleted successfully!");
    }
}