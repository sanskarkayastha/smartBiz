package com.smartbiz.payment;

public class PlanLimitException extends RuntimeException {
    private final String code;
    private final String feature;
    private final long used;
    private final long limit;

    public PlanLimitException(String code, String feature, long used, long limit) {
        super("PRO_REQUIRED".equals(code) ? feature + " requires SmartBiz Pro" : feature + " has reached the Free plan limit");
        this.code = code;
        this.feature = feature;
        this.used = used;
        this.limit = limit;
    }

    public String getCode() { return code; }
    public String getFeature() { return feature; }
    public long getUsed() { return used; }
    public long getLimit() { return limit; }
}
