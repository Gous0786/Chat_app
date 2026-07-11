package com.whatsapp.Web.request;

/** Opaque password-encrypted backup blob + PBKDF2/AES-GCM params. */
public class KeyBackupRequest {

    private String ciphertext;
    private String salt;
    private String iv;
    private Integer iterations;

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
}
