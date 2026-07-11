package com.whatsapp.Web.repository;

import com.whatsapp.Web.model.SignalIdentity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SignalIdentityRepository extends JpaRepository<SignalIdentity, Integer> {
    Optional<SignalIdentity> findByUserId(Integer userId);
}
