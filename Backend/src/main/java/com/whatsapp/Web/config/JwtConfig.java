package com.whatsapp.Web.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtConfig {
    @Value("${JWT_SECRET_KEY:qegfghsdfgrtsubyjtynrbevthgvgsrthv}")
    public String secretKey;

    @Value("${JWT_EXPIRATION_TIME:85400000}")
    public long expirationTime;

    public String getSecretKey() {
        return secretKey;
    }

    public long getExpirationTime() {
        return expirationTime;
    }
}
