package com.whatsapp.Web.repository;

import com.whatsapp.Web.model.KeyBackup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface KeyBackupRepository extends JpaRepository<KeyBackup, Integer> {
    Optional<KeyBackup> findByUserId(Integer userId);
}
