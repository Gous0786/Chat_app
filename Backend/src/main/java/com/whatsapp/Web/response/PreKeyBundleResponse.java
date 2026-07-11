package com.whatsapp.Web.response;

/**
 * The public prekey bundle a peer fetches to start a session (X3DH).
 * `preKeyId`/`preKeyPublic` may be null when the one-time pool is empty —
 * X3DH still works without a one-time prekey.
 */
public class PreKeyBundleResponse {

    private Integer registrationId;
    private String identityKey;
    private Integer signedPreKeyId;
    private String signedPreKeyPublic;
    private String signedPreKeySignature;
    private Integer preKeyId;
    private String preKeyPublic;

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

    public Integer getPreKeyId() {
        return preKeyId;
    }

    public void setPreKeyId(Integer preKeyId) {
        this.preKeyId = preKeyId;
    }

    public String getPreKeyPublic() {
        return preKeyPublic;
    }

    public void setPreKeyPublic(String preKeyPublic) {
        this.preKeyPublic = preKeyPublic;
    }
}
