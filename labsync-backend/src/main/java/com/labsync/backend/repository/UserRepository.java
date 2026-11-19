package com.labsync.backend.repository;

import com.labsync.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    List<User> findByRoleIgnoreCase(String role);
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByUserId(String userId);// 👈 Change Long to String here
}