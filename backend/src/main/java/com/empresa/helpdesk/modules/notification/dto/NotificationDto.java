package com.empresa.helpdesk.modules.notification.dto;

import java.time.LocalDateTime;

public record NotificationDto(
        String type,
        String title,
        String description,
        LocalDateTime date,
        Long refId
) {
    public static final String TYPE_TICKET_CREATED = "TICKET_CREATED";
    public static final String TYPE_PASSWORD_CHANGED = "PASSWORD_CHANGED";
    public static final String TYPE_USER_PENDING = "USER_PENDING";
    public static final String TYPE_TASK_ASSIGNED = "TASK_ASSIGNED";
    public static final String TYPE_TASK_COMPLETED = "TASK_COMPLETED";
}
