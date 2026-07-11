package com.whatsapp.Web.request;

import java.util.List;

/** Replenish the one-time prekey pool with more public prekeys. */
public class PreKeyListRequest {

    private List<PublishBundleRequest.PreKeyDto> oneTimePreKeys;

    public List<PublishBundleRequest.PreKeyDto> getOneTimePreKeys() {
        return oneTimePreKeys;
    }

    public void setOneTimePreKeys(List<PublishBundleRequest.PreKeyDto> oneTimePreKeys) {
        this.oneTimePreKeys = oneTimePreKeys;
    }
}
