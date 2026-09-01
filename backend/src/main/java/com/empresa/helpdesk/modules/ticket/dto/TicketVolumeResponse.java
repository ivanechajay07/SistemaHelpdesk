package com.empresa.helpdesk.modules.ticket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketVolumeResponse {
    private String name; // e.g., "Ene", "Feb", "Mar"
    private long tickets;
}
