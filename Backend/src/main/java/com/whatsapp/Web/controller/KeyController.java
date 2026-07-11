package com.whatsapp.Web.controller;

import com.whatsapp.Web.exception.UserException;
import com.whatsapp.Web.model.User;
import com.whatsapp.Web.request.PreKeyListRequest;
import com.whatsapp.Web.request.PublishBundleRequest;
import com.whatsapp.Web.response.ApiResponse;
import com.whatsapp.Web.response.PreKeyBundleResponse;
import com.whatsapp.Web.service.SignalKeyService;
import com.whatsapp.Web.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Signal prekey directory. All write endpoints are token-scoped (the acting user
 * is resolved from the JWT, never from a URL id), so a user can only publish keys
 * for themselves. The server stores public key material only.
 */
@RestController
@RequestMapping("/api/keys")
public class KeyController {

    private final SignalKeyService signalKeyService;
    private final UserService userService;

    public KeyController(SignalKeyService signalKeyService, UserService userService) {
        this.signalKeyService = signalKeyService;
        this.userService = userService;
    }

    @PostMapping("/bundle")
    public ResponseEntity<ApiResponse> publishBundle(@RequestBody PublishBundleRequest req,
                                                     @RequestHeader("Authorization") String jwt) throws UserException {
        User user = userService.findUserByProfile(jwt);
        signalKeyService.publishBundle(user, req);
        return new ResponseEntity<>(new ApiResponse("bundle published", true), HttpStatus.OK);
    }

    @PostMapping("/prekeys")
    public ResponseEntity<ApiResponse> replenish(@RequestBody PreKeyListRequest req,
                                                 @RequestHeader("Authorization") String jwt) throws UserException {
        User user = userService.findUserByProfile(jwt);
        signalKeyService.replenishPreKeys(user, req);
        return new ResponseEntity<>(new ApiResponse("prekeys added", true), HttpStatus.OK);
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> count(@RequestHeader("Authorization") String jwt) throws UserException {
        User user = userService.findUserByProfile(jwt);
        long count = signalKeyService.countOneTimePreKeys(user);
        return new ResponseEntity<>(Map.of("oneTimePreKeyCount", count), HttpStatus.OK);
    }

    @GetMapping("/bundle/{userId}")
    public ResponseEntity<PreKeyBundleResponse> fetchBundle(@PathVariable Integer userId,
                                                            @RequestHeader("Authorization") String jwt) throws UserException {
        // jwt required for auth (endpoint under /api/**); acting user need not match target.
        userService.findUserByProfile(jwt);
        PreKeyBundleResponse bundle = signalKeyService.fetchBundle(userId);
        return new ResponseEntity<>(bundle, HttpStatus.OK);
    }
}
