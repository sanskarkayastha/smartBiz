package com.smartbiz.payment;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

public final class EsewaSigner {
    private EsewaSigner() {}

    public static String sign(String secret, Map<String, ?> fields) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalArgumentException("eSewa secret is not configured");
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getEncoder().encodeToString(mac.doFinal(canonical(fields).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to sign eSewa request", exception);
        }
    }

    public static boolean verify(String secret, Map<String, ?> fields, String signature) {
        if (signature == null || signature.isBlank()) return false;
        byte[] expected = Base64.getDecoder().decode(sign(secret, fields));
        byte[] actual;
        try {
            actual = Base64.getDecoder().decode(signature);
        } catch (IllegalArgumentException exception) {
            return false;
        }
        return MessageDigest.isEqual(expected, actual);
    }

    public static LinkedHashMap<String, Object> ordered(Object... pairs) {
        if (pairs.length % 2 != 0) throw new IllegalArgumentException("Key/value pairs are required");
        LinkedHashMap<String, Object> values = new LinkedHashMap<>();
        for (int index = 0; index < pairs.length; index += 2) {
            values.put(String.valueOf(pairs[index]), pairs[index + 1]);
        }
        return values;
    }

    private static String canonical(Map<String, ?> fields) {
        return fields.entrySet().stream()
            .map(entry -> entry.getKey() + "=" + String.valueOf(entry.getValue()))
            .reduce((left, right) -> left + "," + right)
            .orElse("");
    }
}
