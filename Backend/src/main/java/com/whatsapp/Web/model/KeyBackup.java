package com.whatsapp.Web.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Opaque, password-encrypted backup of a user's Signal store. The server stores
 * only ciphertext + the PBKDF2 params needed to re-derive the key on another
 * device; it can never decrypt this without the user's password.
 */
@Entity
public class KeyBackup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @OneToOne
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(columnDefinition = "LONGTEXT")
    private String ciphertext;

    @Column(columnDefinition = "TEXT")
    private String salt;

    @Column(columnDefinition = "TEXT")
    private String iv;

    private Integer iterations;

    private LocalDateTime updatedAt;

    public KeyBackup() {
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

    public String getCiphertext() {
        return ciphertext;
    }

    public void setCiphertext(String ciphertext) {
        this.ciphertext = ciphertext;
    }

    public String getSalt() {
        return salt;
    }

    public void setSalt(String salt) {
        this.salt = salt;
    }

    public String getIv() {
        return iv;
    }

    public void setIv(String iv) {
        this.iv = iv;
    }

    public Integer getIterations() {
        return iterations;
    }

    public void setIterations(Integer iterations) {
        this.iterations = iterations;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof KeyBackup)) return false;
        return Objects.equals(id, ((KeyBackup) o).id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
