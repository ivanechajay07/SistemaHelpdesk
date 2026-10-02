package com.empresa.helpdesk.modules.settings.service;

import com.empresa.helpdesk.modules.settings.dto.AutomationSettingsDto;
import com.empresa.helpdesk.modules.settings.entity.AppSetting;
import com.empresa.helpdesk.modules.settings.repository.AppSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AutomationSettingsService {

    private static final String KEY_AUTO_ASSIGNMENT = "automation.auto_assignment";
    private static final String KEY_SLA_ESCALATION = "automation.sla_escalation";

    private final AppSettingRepository repository;

    @Transactional(readOnly = true)
    public AutomationSettingsDto get() {
        return new AutomationSettingsDto(
                getBoolean(KEY_AUTO_ASSIGNMENT, false),
                getBoolean(KEY_SLA_ESCALATION, true));
    }

    @Transactional
    public AutomationSettingsDto update(AutomationSettingsDto dto) {
        setBoolean(KEY_AUTO_ASSIGNMENT, dto.autoAssignment());
        setBoolean(KEY_SLA_ESCALATION, dto.slaEscalation());
        return get();
    }

    @Transactional(readOnly = true)
    public boolean isAutoAssignmentEnabled() {
        return getBoolean(KEY_AUTO_ASSIGNMENT, false);
    }

    @Transactional(readOnly = true)
    public boolean isSlaEscalationEnabled() {
        return getBoolean(KEY_SLA_ESCALATION, true);
    }

    private boolean getBoolean(String key, boolean defaultValue) {
        return repository.findById(key)
                .map(s -> Boolean.parseBoolean(s.getValue()))
                .orElse(defaultValue);
    }

    private void setBoolean(String key, boolean value) {
        repository.save(AppSetting.builder().key(key).value(Boolean.toString(value)).build());
    }
}
