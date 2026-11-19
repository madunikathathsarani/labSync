package com.labsync.backend.service;

import com.labsync.backend.model.User;
import com.labsync.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User saveUser(User user) {
        return userRepository.save(user);
    }

    public User getUserById(String userId) {
        return userRepository.findById(userId).orElse(null);
    }

    public User updateUser(String userId, User d) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return null;

        if (d.getName() != null && !d.getName().isBlank()) user.setName(d.getName());
        if (d.getEmail() != null && !d.getEmail().isBlank()) user.setEmail(d.getEmail());
        if (d.getContactNo() != null) user.setContactNo(d.getContactNo());
        if (d.getRole() != null && !d.getRole().isBlank()) user.setRole(d.getRole());

        // Password changes only when a new one is sent
        if (d.getPassword() != null && !d.getPassword().isBlank()) {
            user.setPassword(d.getPassword());
            user.setMustChangePassword(d.getMustChangePassword() == null ? true : d.getMustChangePassword());
        } else if (d.getMustChangePassword() != null) {
            user.setMustChangePassword(d.getMustChangePassword());
        }
        return userRepository.save(user);
    }

    public void deleteUser(String userId) {
        userRepository.deleteById(userId);
    }
}