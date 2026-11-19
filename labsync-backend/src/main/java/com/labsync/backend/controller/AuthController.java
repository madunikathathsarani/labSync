package com.labsync.backend.controller;

import com.labsync.backend.model.User;
import com.labsync.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.labsync.backend.service.EmailService emailService;

    // email -> { code, expiresAt }
    private final Map<String, String> otpCodes = new ConcurrentHashMap<>();
    private final Map<String, Long> otpExpiry = new ConcurrentHashMap<>();

    private String key(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = key(body.get("email"));
        Optional<User> user = userRepository.findByEmailIgnoreCase(email);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Email not registered");
        }
        String code = String.valueOf(100000 + new java.util.Random().nextInt(900000));
        otpCodes.put(email, code);
        otpExpiry.put(email, System.currentTimeMillis() + 5 * 60 * 1000);

        emailService.send(
                new String[] { email },
                "LabSync password reset code",
                "Your LabSync verification code is: " + code
                        + "\n\nThis code expires in 5 minutes. If you did not request it, ignore this email."
        );
        System.out.println("[OTP] " + email + " -> " + code); // debug only, remove later
        return ResponseEntity.ok("Code sent");
    }
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body) {
        String email = key(body.get("email"));
        String otp = body.get("otp");
        if (isValid(email, otp)) return ResponseEntity.ok("Verified");
        return ResponseEntity.badRequest().body("Invalid or expired code");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String email = key(body.get("email"));
        if (!isValid(email, body.get("otp"))) {
            return ResponseEntity.badRequest().body("Invalid or expired code");
        }
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Email not registered");

        user.setPassword(body.get("newPassword"));
        user.setMustChangePassword(false);
        userRepository.save(user);
        otpCodes.remove(email);
        otpExpiry.remove(email);
        return ResponseEntity.ok("Password updated");
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> body) {
        User user = userRepository.findById(body.get("userId")).orElse(null);
        if (user == null || user.getPassword() == null
                || !user.getPassword().equals(body.get("currentPassword"))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Current password is wrong");
        }
        user.setPassword(body.get("newPassword"));
        user.setMustChangePassword(false);
        userRepository.save(user);
        return ResponseEntity.ok("Password changed");
    }

    private boolean isValid(String email, String otp) {
        String saved = otpCodes.get(email);
        Long exp = otpExpiry.get(email);
        return saved != null && exp != null && saved.equals(otp) && System.currentTimeMillis() < exp;
    }
}
