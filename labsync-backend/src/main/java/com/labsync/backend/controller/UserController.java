package com.labsync.backend.controller;

import com.labsync.backend.model.User;
import com.labsync.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/users")

public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {
        if (user.getUserId() != null && !user.getUserId().isBlank()
                && userService.getUserById(user.getUserId()) != null) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("User ID " + user.getUserId() + " already exists. Refresh the page and try again.");
        }
        try {
            return ResponseEntity.ok(userService.saveUser(user));
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("This email is already used by another account.");
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody User loginData) {
        if (loginData.getUserId() == null || loginData.getPassword() == null) {
            return ResponseEntity.badRequest().body("User ID and Password are required!");
        }

        User user = userService.getUserById(loginData.getUserId());

        if (user != null && user.getPassword().equals(loginData.getPassword())) {
            return ResponseEntity.ok(user);
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid User ID or Password!");
        }
    }

    @PutMapping("/{userId}")
    public ResponseEntity<?> updateUser(@PathVariable String userId, @RequestBody User user) {
        try {
            User updated = userService.updateUser(userId, user);
            if (updated == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found.");
            }
            return ResponseEntity.ok(updated);
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("This email is already used by another account.");
        }
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<String> deleteUser(@PathVariable String userId) {
        try {
            userService.deleteUser(userId);
            return ResponseEntity.ok("User deleted successfully!");
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("This user cannot be deleted because fault tickets or reservations are linked to them.");
        }
    }
}