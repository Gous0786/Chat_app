package com.whatsapp.Web.model;

import jakarta.persistence.*;

import java.util.Objects;

/**
 * A user's published Signal identity + current signed prekey (public halves only).
 * The server stores these so peers can build a session (X3DH). It never sees
 * any private key. All key/signature fields are Base64-encoded strings.
 */
@Entity
public class SignalIdentity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Integer id;

    @OneToOne
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    private Integer registrationId;

    @Column(columnDefinition = "TEXT")
    private String identityKey;

    private Integer signedPreKeyId;

    @Column(columnDefinition = "TEXT")
    private String signedPreKeyPublic;

    @Column(columnDefinition = "TEXT")
    private String signedPreKeySignature;

    public SignalIdentity() {
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
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

    // id-only equality; never enumerate the User relation (recursion risk).
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof SignalIdentity)) return false;
        return Objects.equals(id, ((SignalIdentity) o).id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
