package com.smartbiz.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class VerificationEmailService {
    private final JavaMailSender mailSender;

    @Value("${app.auth.email.enabled:false}")
    private boolean emailEnabled;

    @Value("${app.auth.email.from:no-reply@smartbiz.app}")
    private String fromEmail;

    @Value("${app.auth.email.dev-log-otp:true}")
    private boolean devLogOtp;

    @Value("${app.auth.verification.code-expiry-minutes:10}")
    private int codeExpiryMinutes;

    public void sendVerificationCode(String email, String fullName, String code) {
        if (!emailEnabled) {
            if (devLogOtp) {
                log.warn("Email delivery disabled. OTP for {} is {}", email, code);
            }
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(email);
        message.setSubject("Verify your SmartBiz email");
        message.setText(buildBody(fullName, code));

        try {
            mailSender.send(message);
        } catch (MailException e) {
            throw new IllegalStateException("Could not send verification email right now");
        }
    }

    private String buildBody(String fullName, String code) {
        String safeName = (fullName == null || fullName.isBlank()) ? "there" : fullName;
        return """
            Hi %s,

            Welcome to SmartBiz.

            Your verification code is: %s

            This code expires in %d minutes.

            If you did not create this account, you can ignore this email.
            """.formatted(safeName, code, codeExpiryMinutes);
    }
}
