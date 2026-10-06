package com.empresa.helpdesk.modules.monitoring.enums;

public enum TargetType {
    HTTP,
    TCP,
    /** Ping ICMP: ideal para vigilar equipos (PCs, impresoras, routers) por IP. */
    PING
}
