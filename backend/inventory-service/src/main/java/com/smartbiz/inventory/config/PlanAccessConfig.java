package com.smartbiz.inventory.config;

import com.smartbiz.payment.PlanAccessClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class PlanAccessConfig {
    @Bean
    PlanAccessClient planAccessClient(
        @Value("${app.auth-service-url:http://localhost:8081}") String url,
        @Value("${app.internal-service-token:smartbiz-internal-dev-token}") String token
    ) { return new PlanAccessClient(url, token); }
}
