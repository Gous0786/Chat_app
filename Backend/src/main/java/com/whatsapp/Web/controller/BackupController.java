package com.whatsapp.Web.controller;

import com.whatsapp.Web.exception.UserException;
import com.whatsapp.Web.model.KeyBackup;
import com.whatsapp.Web.model.User;
import com.whatsapp.Web.request.KeyBackupRequest;
import com.whatsapp.Web.response.ApiResponse;
import com.whatsapp.Web.service.BackupService;
import com.whatsapp.Web.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

/**
 * Opaque password-encrypted key backup. Token-scoped: a user can only read/write
 * their own backup. The server stores ciphertext it cannot decrypt.
 */
@RestController
@RequestMapping("/api/backup")
public class BackupController {

    private final BackupService backupService;
    private final UserService userService;

    public BackupController(BackupService backupService, UserService userService) {
        this.backupService = backupService;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse> saveBackup(@RequestBody KeyBackupRequest req,
                                                  @RequestHeader("Authorization") String jwt) throws UserException {
        User user = userService.findUserByProfile(jwt);
        backupService.saveBackup(user, req);
        return new ResponseEntity<>(new ApiResponse("backup saved", true), HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<KeyBackup> getBackup(@RequestHeader("Authorization") String jwt) throws UserException {
        User user = userService.findUserByProfile(jwt);
        Optional<KeyBackup> backup = backupService.getBackup(user);
        return backup.map(b -> new ResponseEntity<>(b, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }
}
