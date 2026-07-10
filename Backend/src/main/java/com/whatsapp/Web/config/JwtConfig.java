package com.whatsapp.Web.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtConfig {
    // No default: the app must fail to start unless a secret is provided.
    // Never hardcode a fallback — a committed secret lets anyone forge tokens.
    @Value("${JWT_SECRET_KEY}")
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
