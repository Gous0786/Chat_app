package com.whatsapp.Web.model;

import jakarta.persistence.*;

import java.util.Objects;

/**
 * A single-use prekey in a user's pool. The server hands out (and deletes) one
 * per new session so each X3DH handshake consumes a distinct key. Public half only.
 */
@Entity
public class OneTimePreKey {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    private Integer preKeyId;

    @Column(columnDefinition = "TEXT")
    private String publicKey;

    public OneTimePreKey() {
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

    public Integer getPreKeyId() {
        return preKeyId;
    }

    public void setPreKeyId(Integer preKeyId) {
        this.preKeyId = preKeyId;
    }

    public String getPublicKey() {
        return publicKey;
    }

    public void setPublicKey(String publicKey) {
        this.publicKey = publicKey;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof OneTimePreKey)) return false;
        return Objects.equals(id, ((OneTimePreKey) o).id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
