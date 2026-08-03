package com.smartbiz.sales.config;

import org.springframework.cloud.client.loadbalancer.LoadBalanced;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import com.smartbiz.payment.PlanAccessClient;
import org.springframework.beans.factory.annotation.Value;

@Configuration
public class AppConfig {

    @Bean
    @LoadBalanced
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    @Bean
    public PlanAccessClient planAccessClient(
        @Value("${app.auth-service-url:http://localhost:8081}") String url,
        @Value("${app.internal-service-token:smartbiz-internal-dev-token}") String token
    ) { return new PlanAccessClient(url, token); }
}
