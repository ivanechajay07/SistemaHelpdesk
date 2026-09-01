package com.empresa.helpdesk.modules.chat.repository;

import com.empresa.helpdesk.modules.chat.entity.FileAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FileAttachmentRepository extends JpaRepository<FileAttachment, Long> {
    List<FileAttachment> findByTicketId(Long ticketId);
}
