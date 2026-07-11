package com.whatsapp.Web.service;

import com.whatsapp.Web.model.KeyBackup;
import com.whatsapp.Web.model.User;
import com.whatsapp.Web.repository.KeyBackupRepository;
import com.whatsapp.Web.request.KeyBackupRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class BackupServiceImplementation implements BackupService {

    private final KeyBackupRepository backupRepository;

    public BackupServiceImplementation(KeyBackupRepository backupRepository) {
        this.backupRepository = backupRepository;
    }

    @Override
    public void saveBackup(User user, KeyBackupRequest req) {
        KeyBackup backup = backupRepository.findByUserId(user.getId()).orElseGet(KeyBackup::new);
        backup.setUser(user);
        backup.setCiphertext(req.getCiphertext());
        backup.setSalt(req.getSalt());
        backup.setIv(req.getIv());
        backup.setIterations(req.getIterations());
        backup.setUpdatedAt(LocalDateTime.now());
        backupRepository.save(backup);
    }

    @Override
    public Optional<KeyBackup> getBackup(User user) {
        return backupRepository.findByUserId(user.getId());
    }
}
