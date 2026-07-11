package com.whatsapp.Web.service;

import com.whatsapp.Web.exception.UserException;
import com.whatsapp.Web.model.OneTimePreKey;
import com.whatsapp.Web.model.SignalIdentity;
import com.whatsapp.Web.model.User;
import com.whatsapp.Web.repository.OneTimePreKeyRepository;
import com.whatsapp.Web.repository.SignalIdentityRepository;
import com.whatsapp.Web.request.PreKeyListRequest;
import com.whatsapp.Web.request.PublishBundleRequest;
import com.whatsapp.Web.response.PreKeyBundleResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SignalKeyServiceImplementation implements SignalKeyService {

    private final SignalIdentityRepository identityRepository;
    private final OneTimePreKeyRepository preKeyRepository;
    private final UserService userService;

    public SignalKeyServiceImplementation(SignalIdentityRepository identityRepository,
                                          OneTimePreKeyRepository preKeyRepository,
                                          UserService userService) {
        this.identityRepository = identityRepository;
        this.preKeyRepository = preKeyRepository;
        this.userService = userService;
    }

    @Override
    @Transactional
    public void publishBundle(User user, PublishBundleRequest req) {
        // Upsert the identity + signed prekey for this user.
        SignalIdentity identity = identityRepository.findByUserId(user.getId())
                .orElseGet(SignalIdentity::new);
        identity.setUser(user);
        identity.setRegistrationId(req.getRegistrationId());
        identity.setIdentityKey(req.getIdentityKey());
        identity.setSignedPreKeyId(req.getSignedPreKeyId());
        identity.setSignedPreKeyPublic(req.getSignedPreKeyPublic());
        identity.setSignedPreKeySignature(req.getSignedPreKeySignature());
        identityRepository.save(identity);

        // Append the one-time prekeys to the pool.
        appendPreKeys(user, req.getOneTimePreKeys());
    }

    @Override
    @Transactional
    public void replenishPreKeys(User user, PreKeyListRequest req) {
        appendPreKeys(user, req.getOneTimePreKeys());
    }

    private void appendPreKeys(User user, List<PublishBundleRequest.PreKeyDto> keys) {
        if (keys == null) return;
        for (PublishBundleRequest.PreKeyDto dto : keys) {
            OneTimePreKey pk = new OneTimePreKey();
            pk.setUser(user);
            pk.setPreKeyId(dto.getId());
            pk.setPublicKey(dto.getPublicKey());
            preKeyRepository.save(pk);
        }
    }

    @Override
    public long countOneTimePreKeys(User user) {
        return preKeyRepository.countByUserId(user.getId());
    }

    @Override
    @Transactional
    public PreKeyBundleResponse fetchBundle(Integer targetUserId) throws UserException {
        SignalIdentity identity = identityRepository.findByUserId(targetUserId)
                .orElseThrow(() -> new UserException("User has not published encryption keys: " + targetUserId));

        PreKeyBundleResponse res = new PreKeyBundleResponse();
        res.setRegistrationId(identity.getRegistrationId());
        res.setIdentityKey(identity.getIdentityKey());
        res.setSignedPreKeyId(identity.getSignedPreKeyId());
        res.setSignedPreKeyPublic(identity.getSignedPreKeyPublic());
        res.setSignedPreKeySignature(identity.getSignedPreKeySignature());

        // Atomically claim one one-time prekey (pessimistic lock serializes concurrent fetchers).
        List<OneTimePreKey> locked = preKeyRepository.lockOldestForUser(targetUserId, PageRequest.of(0, 1));
        if (!locked.isEmpty()) {
            OneTimePreKey pk = locked.get(0);
            res.setPreKeyId(pk.getPreKeyId());
            res.setPreKeyPublic(pk.getPublicKey());
            preKeyRepository.delete(pk); // consumed — one-time use
        }
        // If empty, the bundle is returned without a one-time prekey (X3DH allows this).
        return res;
    }
}
