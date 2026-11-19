package com.labsync.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @Column(name = "userID", length = 10)
    private String userId;

    @Column(name = "fullName", nullable = false)
    private String name;

    @Column(name = "email", unique = true, nullable = false)
    private String email;

    @Column(name = "passwordHash", nullable = false)
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
    private String password;

    @Column(name = "role")
    private String role;

    @Column(name = "contactNo", nullable = false)
    private String contactNo;

    @Column(name = "mustChangePassword", nullable = false)
    private Boolean mustChangePassword = false;

    @PrePersist
    public void generateCustomUserId() {
        if (this.userId == null || this.userId.isEmpty()) {
            String prefix = "U";

            if (this.role != null) {
                switch (this.role.toUpperCase()) {
                    case "ADMIN":
                        prefix = "A";
                        break;
                    case "LECTURER":
                        prefix = "L";
                        break;
                    case "TECHNICIAN":
                        prefix = "T";
                        break;
                }
            }

            int number = (int) (Math.random() * 900) + 100;
            this.userId = prefix + String.format("%03d", number);
        }
    }

    // Explicit Getters and Setters
    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getPasswordHash() {
        return password;
    }

    public void setPasswordHash(String password) {
        this.password = password;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}