package com.whatsapp.Web.service;

import com.whatsapp.Web.model.KeyBackup;
import com.whatsapp.Web.model.User;
import com.whatsapp.Web.request.KeyBackupRequest;

import java.util.Optional;

public interface BackupService {

    void saveBackup(User user, KeyBackupRequest req);

    Optional<KeyBackup> getBackup(User user);
}
