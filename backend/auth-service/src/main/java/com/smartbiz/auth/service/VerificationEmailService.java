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

    @Value("${app.auth.password-reset.code-expiry-minutes:10}")
    private int passwordResetCodeExpiryMinutes;

    public void sendVerificationCode(String email, String fullName, String code) {
        sendEmail(
            email,
            "Verify your SmartBiz email",
            buildVerificationBody(fullName, code),
            "verification",
            code
        );
    }

    public void sendPasswordResetCode(String email, String fullName, String code) {
        sendEmail(
            email,
            "Reset your SmartBiz password",
            buildPasswordResetBody(fullName, code),
            "password reset",
            code
        );
    }

    private void sendEmail(String email, String subject, String body, String emailType, String code) {
        if (!emailEnabled) {
            if (devLogOtp) {
                log.warn("Email delivery disabled. {} OTP for {} is {}", emailType, email, code);
            }
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(email);
        message.setSubject(subject);
        message.setText(body);

        try {
            mailSender.send(message);
        } catch (MailException e) {
            throw new IllegalStateException("Could not send email right now");
        }
    }

    private String buildVerificationBody(String fullName, String code) {
        String safeName = (fullName == null || fullName.isBlank()) ? "there" : fullName;
        return """
            Hi %s,

            Welcome to SmartBiz.

            Your verification code is: %s

            This code expires in %d minutes.

            If you did not create this account, you can ignore this email.
            """.formatted(safeName, code, codeExpiryMinutes);
    }

    private String buildPasswordResetBody(String fullName, String code) {
        String safeName = (fullName == null || fullName.isBlank()) ? "there" : fullName;
        return """
            Hi %s,

            We received a request to reset your SmartBiz password.

            Your password reset code is: %s

            This code expires in %d minutes.

            If you did not request a password reset, you can ignore this email.
            """.formatted(safeName, code, passwordResetCodeExpiryMinutes);
    }
}
