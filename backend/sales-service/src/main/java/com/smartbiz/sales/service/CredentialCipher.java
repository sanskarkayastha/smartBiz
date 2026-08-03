package com.smartbiz.sales.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class CredentialCipher {
    private final byte[] key;
    private final SecureRandom random = new SecureRandom();

    public CredentialCipher(@Value("${app.esewa.credential-encryption-key:smartbiz-dev-credential-key-change-me}") String value) {
        try { this.key = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)); }
        catch (Exception exception) { throw new IllegalStateException(exception); }
    }

    public String encrypt(String plaintext) {
        try {
            byte[] iv = new byte[12];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] payload = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, payload, 0, iv.length);
            System.arraycopy(encrypted, 0, payload, iv.length, encrypted.length);
            return "v1:" + Base64.getEncoder().encodeToString(payload);
        } catch (Exception exception) { throw new IllegalStateException("Could not encrypt merchant credential", exception); }
    }

    public String decrypt(String encoded) {
        try {
            byte[] payload = Base64.getDecoder().decode(encoded.substring(3));
            byte[] iv = java.util.Arrays.copyOfRange(payload, 0, 12);
            byte[] encrypted = java.util.Arrays.copyOfRange(payload, 12, payload.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception exception) { throw new IllegalStateException("Could not decrypt merchant credential", exception); }
    }
}
