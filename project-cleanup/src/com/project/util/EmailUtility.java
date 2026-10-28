package com.project.util;

import java.util.Properties;
import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

public class EmailUtility {

    public static void sendEmail(String toAddress, String subject, String messageContent) throws MessagingException {
        Properties config = new Properties();
        try (java.io.InputStream input = EmailUtility.class.getClassLoader().getResourceAsStream("mail.properties")) {
            if (input != null) {
                config.load(input);
            }
        } catch (java.io.IOException ex) {
            throw new MessagingException("Error loading mail.properties from classpath", ex);
        }
        java.io.File file = new java.io.File("src/mail.properties");
        if (!file.exists()) {
            file = new java.io.File("c:/tomcat10/webapps/project/src/mail.properties");
        }
        if (file.exists()) {
            try (java.io.InputStream fileIn = new java.io.FileInputStream(file)) {
                config.load(fileIn);
            } catch (java.io.IOException ex) {
                throw new MessagingException("Error loading mail.properties from file", ex);
            }
        }
        if (config.isEmpty()) {
            throw new MessagingException("mail.properties not found. Please create/update src/mail.properties.");
        }

        final String user = config.getProperty("mail.user");
        final String pass = config.getProperty("mail.password");
        final String from = config.getProperty("mail.from", user);

        Properties props = new Properties();
        for (String key : config.stringPropertyNames()) {
            if (key.startsWith("mail.smtp.")) {
                props.put(key, config.getProperty(key));
            }
        }
        if (!props.containsKey("mail.smtp.host")) props.put("mail.smtp.host", "smtp.gmail.com");
        if (!props.containsKey("mail.smtp.port")) props.put("mail.smtp.port", "587");
        if (!props.containsKey("mail.smtp.auth")) props.put("mail.smtp.auth", "true");
        if (!props.containsKey("mail.smtp.starttls.enable")) props.put("mail.smtp.starttls.enable", "true");
        if (!props.containsKey("mail.smtp.starttls.required")) props.put("mail.smtp.starttls.required", "true");
        if (!props.containsKey("mail.smtp.ssl.trust")) props.put("mail.smtp.ssl.trust", props.getProperty("mail.smtp.host"));
        if (!props.containsKey("mail.smtp.connectiontimeout")) props.put("mail.smtp.connectiontimeout", "10000");
        if (!props.containsKey("mail.smtp.timeout")) props.put("mail.smtp.timeout", "10000");

        boolean smtpAuth = "true".equalsIgnoreCase(props.getProperty("mail.smtp.auth", "true"));
        if (smtpAuth) {
            if (isMissingOrPlaceholder(user) || isMissingOrPlaceholder(pass)) {
                throw new MessagingException("Email sending is not configured. Update src/mail.properties: set mail.user, mail.password (Gmail App Password), and mail.from.");
            }
        }

        Session session;
        if (smtpAuth) {
            Authenticator auth = new Authenticator() {
                public PasswordAuthentication getPasswordAuthentication() {
                    return new PasswordAuthentication(user, pass);
                }
            };
            session = Session.getInstance(props, auth);
        } else {
            session = Session.getInstance(props);
        }
        if ("true".equalsIgnoreCase(config.getProperty("mail.debug"))) {
            session.setDebug(true);
        }

        Message msg = new MimeMessage(session);

        if (isMissingOrPlaceholder(from)) {
            throw new MessagingException("mail.from is not configured. Update src/mail.properties (mail.from=your_email@example.com).");
        }
        msg.setFrom(new InternetAddress(from));
        InternetAddress[]toAddresses = { new InternetAddress(toAddress) };
        msg.setRecipients(Message.RecipientType.TO, toAddresses);
        msg.setSubject(subject);
        msg.setSentDate(new java.util.Date());
        msg.setText(messageContent);

        Transport.send(msg);
    }

    private static boolean isMissingOrPlaceholder(String value) {
        if (value == null) return true;
        String v = value.trim();
        if (v.isEmpty()) return true;
        return v.contains("ENTER_YOUR") || v.contains("YOUR_GMAIL") || v.contains("YOUR_APP_PASSWORD") || v.contains("YOUR_GMAIL_APP_PASSWORD");
    }
}
