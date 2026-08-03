package com.smartbiz.payment;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EsewaSignerTest {
    @Test
    void signsTheCanonicalFieldsInOrder() {
        String signature = EsewaSigner.sign(
            "8gBm/:&EnhH.1/q",
            EsewaSigner.ordered(
                "total_amount", "100",
                "transaction_uuid", "11-201-13",
                "product_code", "EPAYTEST"
            )
        );

        assertEquals("5DZywcrTKD0gia/rsSMcrRHmJl+4Tbol6S+lWgdJ94E=", signature);
        assertTrue(EsewaSigner.verify(
            "8gBm/:&EnhH.1/q",
            EsewaSigner.ordered(
                "total_amount", "100",
                "transaction_uuid", "11-201-13",
                "product_code", "EPAYTEST"
            ),
            signature
        ));
    }
}
