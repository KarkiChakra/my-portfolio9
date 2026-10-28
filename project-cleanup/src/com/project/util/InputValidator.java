package com.project.util;

import java.util.regex.Pattern;

public final class InputValidator {
    private static final Pattern USERNAME = Pattern.compile("^[\\p{L}\\p{N}_.-]{3,30}$");
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private InputValidator() {}

    public static String normalizedUsername(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return USERNAME.matcher(normalized).matches() ? normalized : null;
    }

    public static String normalizedEmail(String value) {
        if (value == null) return null;
        String normalized = value.trim().toLowerCase(java.util.Locale.ROOT);
        return normalized.length() <= 254 && EMAIL.matcher(normalized).matches() ? normalized : null;
    }

    public static boolean isStrongPassword(String value) {
        if (value == null || value.length() < 10 || value.length() > 128) return false;
        boolean letter = false, digit = false, special = false;
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (Character.isLetter(c)) letter = true;
            else if (Character.isDigit(c)) digit = true;
            else if (!Character.isWhitespace(c)) special = true;
        }
        return letter && digit && special;
    }

    public static String safeLocalRedirect(String value, String fallback) {
        if (value == null || value.isBlank()) return fallback;
        String candidate = value.trim();
        if (candidate.startsWith("/") || candidate.contains(":") || candidate.contains("\\")
                || candidate.contains("\r") || candidate.contains("\n")) return fallback;
        return candidate.matches("[A-Za-z0-9_./?=&%-]+") ? candidate : fallback;
    }
}
