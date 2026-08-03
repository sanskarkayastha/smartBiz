package com.smartbiz.payment;

public class PlanAccessUnavailableException extends RuntimeException {
    public PlanAccessUnavailableException() { super("Plan access could not be verified. Please try again."); }
}
