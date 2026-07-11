package com.whatsapp.Web.repository;

import com.whatsapp.Web.model.OneTimePreKey;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OneTimePreKeyRepository extends JpaRepository<OneTimePreKey, Integer> {

    long countByUserId(Integer userId);

    /**
     * Oldest available one-time prekeys for a user, write-locked so two concurrent
     * bundle fetches can't hand out the same key. Caller uses Pageable(0,1) to claim one.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM OneTimePreKey p WHERE p.user.id = :userId ORDER BY p.id ASC")
    List<OneTimePreKey> lockOldestForUser(@Param("userId") Integer userId, Pageable pageable);
}
