package com.smartbiz.inventory.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.cloudinary")
@Data
public class CloudinaryProperties {
    private boolean enabled;
    private String cloudName = "";
    private String apiKey = "";
    private String apiSecret = "";
    private String uploadPreset = "smartbiz_product_images";

    public boolean isConfigured() {
        return enabled
            && !cloudName.isBlank()
            && !apiKey.isBlank()
            && !apiSecret.isBlank()
            && !uploadPreset.isBlank();
    }
}
