package com.empresa.helpdesk.modules.ticket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsResponse {
    private long totalTickets;
    private long inProgressTickets;
    private long resolvedTickets;
    private long overdueTickets;
}
