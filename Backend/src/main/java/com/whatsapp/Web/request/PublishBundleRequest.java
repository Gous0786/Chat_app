package com.whatsapp.Web.request;

import java.util.List;

/**
 * A client publishing its public prekey material. All key/signature fields are
 * Base64 strings. One-time prekeys are appended to the server-side pool.
 */
public class PublishBundleRequest {

    private Integer registrationId;
    private String identityKey;
    private Integer signedPreKeyId;
    private String signedPreKeyPublic;
    private String signedPreKeySignature;
    private List<PreKeyDto> oneTimePreKeys;

    public static class PreKeyDto {
        private Integer id;
        private String publicKey;

        public Integer getId() {
            return id;
        }

        public void setId(Integer id) {
            this.id = id;
        }

        public String getPublicKey() {
            return publicKey;
        }

        public void setPublicKey(String publicKey) {
            this.publicKey = publicKey;
        }
    }

    public Integer getRegistrationId() {
        return registrationId;
    }

    public void setRegistrationId(Integer registrationId) {
        this.registrationId = registrationId;
    }

    public String getIdentityKey() {
        return identityKey;
    }

    public void setIdentityKey(String identityKey) {
        this.identityKey = identityKey;
    }

    public Integer getSignedPreKeyId() {
        return signedPreKeyId;
    }

    public void setSignedPreKeyId(Integer signedPreKeyId) {
        this.signedPreKeyId = signedPreKeyId;
    }

    public String getSignedPreKeyPublic() {
        return signedPreKeyPublic;
    }

    public void setSignedPreKeyPublic(String signedPreKeyPublic) {
        this.signedPreKeyPublic = signedPreKeyPublic;
    }

    public String getSignedPreKeySignature() {
        return signedPreKeySignature;
    }

    public void setSignedPreKeySignature(String signedPreKeySignature) {
        this.signedPreKeySignature = signedPreKeySignature;
    }

    public List<PreKeyDto> getOneTimePreKeys() {
        return oneTimePreKeys;
    }

    public void setOneTimePreKeys(List<PreKeyDto> oneTimePreKeys) {
        this.oneTimePreKeys = oneTimePreKeys;
    }
}
