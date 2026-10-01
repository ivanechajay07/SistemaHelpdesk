package com.empresa.helpdesk.security;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Detecta el dispositivo desde el que se conecta un usuario a partir del
 * header User-Agent: tipo (PC / MOVIL / TABLET), modelo, sistema operativo,
 * navegador e IP. Es una detección "best-effort" sin dependencias externas.
 */
public final class DeviceInfoResolver {

    private DeviceInfoResolver() {
    }

    public record DeviceInfo(String tipo, String modelo, String so, String navegador, String ip) {
    }

    private static final Pattern ANDROID_MODEL =
            Pattern.compile("android[^;)]*;\\s*([^;)]+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern LOCALE_OR_NOISE =
            Pattern.compile("(?i)^([a-z]{2}(-[a-z]{2})?|wv|en|es|build/.*|.*build.*)$");

    public static DeviceInfo resolve(HttpServletRequest request) {
        if (request == null) {
            return new DeviceInfo(null, null, null, null, null);
        }
        String ua = request.getHeader("User-Agent");
        if (ua == null) {
            ua = "";
        }
        String uaL = ua.toLowerCase(Locale.ROOT);

        String tipo = detectTipo(uaL);
        String so = detectSo(uaL);
        String navegador = detectNavegador(uaL);
        String modelo = detectModelo(ua, uaL, so);
        String ip = detectIp(request);

        return new DeviceInfo(tipo, modelo, so, navegador, ip);
    }

    private static String detectTipo(String uaL) {
        if (uaL.contains("ipad") || uaL.contains("tablet") || uaL.contains("kindle")
                || uaL.contains("silk") || (uaL.contains("android") && !uaL.contains("mobile"))) {
            return "TABLET";
        }
        if (uaL.contains("mobi") || uaL.contains("android") || uaL.contains("iphone")
                || uaL.contains("ipod") || uaL.contains("windows phone") || uaL.contains("webos")
                || uaL.contains("blackberry")) {
            return "MOVIL";
        }
        return "PC";
    }

    private static String detectSo(String uaL) {
        if (uaL.contains("windows")) return "Windows";
        if (uaL.contains("iphone") || uaL.contains("ipad") || uaL.contains("ipod")) return "iOS";
        if (uaL.contains("android")) return "Android";
        if (uaL.contains("cros")) return "ChromeOS";
        if (uaL.contains("mac os") || uaL.contains("macintosh")) return "macOS";
        if (uaL.contains("linux")) return "Linux";
        return "Otro";
    }

    private static String detectNavegador(String uaL) {
        if (uaL.contains("edg/") || uaL.contains("edge/")) return "Edge";
        if (uaL.contains("opr/") || uaL.contains("opera")) return "Opera";
        if (uaL.contains("samsungbrowser")) return "Samsung Internet";
        if (uaL.contains("chrome/")) return "Chrome";
        if (uaL.contains("firefox/")) return "Firefox";
        if (uaL.contains("safari/")) return "Safari";
        return "Otro";
    }

    private static String detectModelo(String ua, String uaL, String so) {
        if (uaL.contains("android")) {
            Matcher m = ANDROID_MODEL.matcher(ua);
            String candidato = null;
            while (m.find()) {
                String val = m.group(1).trim().replaceAll("(?i)\\s*build/.*$", "").trim();
                if (val.length() >= 2 && !LOCALE_OR_NOISE.matcher(val).matches()) {
                    candidato = val;
                }
            }
            if (candidato != null) {
                return candidato;
            }
            return "Android";
        }
        if (uaL.contains("iphone")) return "iPhone";
        if (uaL.contains("ipad")) return "iPad";
        if (uaL.contains("ipod")) return "iPod";
        if ("Windows".equals(so)) return "PC Windows";
        if ("macOS".equals(so)) return "Mac";
        if ("Linux".equals(so)) return "PC Linux";
        if ("ChromeOS".equals(so)) return "Chromebook";
        return "Dispositivo";
    }

    private static String detectIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String real = request.getHeader("X-Real-IP");
        if (real != null && !real.isBlank()) {
            return real.trim();
        }
        return request.getRemoteAddr();
    }
}
