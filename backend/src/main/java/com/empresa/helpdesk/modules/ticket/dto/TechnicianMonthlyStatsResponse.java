package com.empresa.helpdesk.modules.ticket.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TechnicianMonthlyStatsResponse {
    private Long tecnicoId;
    private String tecnicoNombre;
    private Integer total;
    private List<Integer> meses;
}
