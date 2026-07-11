package com.whatsapp.Web.service;

import com.whatsapp.Web.exception.UserException;
import com.whatsapp.Web.model.User;
import com.whatsapp.Web.request.PreKeyListRequest;
import com.whatsapp.Web.request.PublishBundleRequest;
import com.whatsapp.Web.response.PreKeyBundleResponse;

public interface SignalKeyService {

    void publishBundle(User user, PublishBundleRequest req);

    void replenishPreKeys(User user, PreKeyListRequest req);

    long countOneTimePreKeys(User user);

    /** Atomically claims (and deletes) one one-time prekey for the target user. */
    PreKeyBundleResponse fetchBundle(Integer targetUserId) throws UserException;
}
