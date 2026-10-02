package com.empresa.helpdesk.modules.settings.repository;

import com.empresa.helpdesk.modules.settings.entity.AppSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppSettingRepository extends JpaRepository<AppSetting, String> {
}
