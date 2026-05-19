package com.smartbiz.crm.service;

import com.smartbiz.crm.dto.*;
import com.smartbiz.crm.exception.LeadNotFoundException;
import com.smartbiz.crm.model.Customer;
import com.smartbiz.crm.model.Lead;
import com.smartbiz.crm.repository.CustomerRepository;
import com.smartbiz.crm.repository.LeadRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeadService {

    private final LeadRepository leadRepository;
    private final CustomerRepository customerRepository;
    private final CrmService crmService;

    public List<LeadDTO> getLeads(Long userId) {
        return leadRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public LeadDTO getLead(Long id, Long userId) {
        return toDTO(findOrThrow(id, userId));
    }

    @Transactional
    public LeadDTO createLead(Long userId, CreateLeadRequest request) {
        Lead lead = new Lead();
        lead.setUserId(userId);
        lead.setName(request.getName());
        lead.setPhone(request.getPhone());
        lead.setEmail(request.getEmail());
        lead.setStage(request.getStage() != null ? request.getStage() : "NEW");
        lead.setSource(request.getSource());
        lead.setEstimatedValue(request.getEstimatedValue());
        lead.setNotes(request.getNotes());
        lead.setFollowUpDate(request.getFollowUpDate());
        log.info("Creating lead: {} for userId: {}", request.getName(), userId);
        return toDTO(leadRepository.save(lead));
    }

    @Transactional
    public LeadDTO updateLead(Long id, Long userId, UpdateLeadRequest request) {
        Lead lead = findOrThrow(id, userId);
        if (request.getName() != null) lead.setName(request.getName());
        if (request.getPhone() != null) lead.setPhone(request.getPhone());
        if (request.getEmail() != null) lead.setEmail(request.getEmail());
        if (request.getStage() != null) lead.setStage(request.getStage());
        if (request.getSource() != null) lead.setSource(request.getSource());
        if (request.getEstimatedValue() != null) lead.setEstimatedValue(request.getEstimatedValue());
        if (request.getNotes() != null) lead.setNotes(request.getNotes());
        if (request.getFollowUpDate() != null) lead.setFollowUpDate(request.getFollowUpDate());
        return toDTO(leadRepository.save(lead));
    }

    @Transactional
    public void deleteLead(Long id, Long userId) {
        Lead lead = findOrThrow(id, userId);
        leadRepository.delete(lead);
        log.info("Deleted leadId={} for userId={}", id, userId);
    }

    @Transactional
    public CustomerDTO convertToCustomer(Long id, Long userId) {
        Lead lead = findOrThrow(id, userId);

        CreateCustomerRequest req = new CreateCustomerRequest();
        req.setName(lead.getName());
        req.setPhone(lead.getPhone());
        req.setEmail(lead.getEmail());
        req.setNotes(lead.getNotes());

        CustomerDTO customer = crmService.create(userId, req);
        leadRepository.delete(lead);
        log.info("Converted leadId={} to customerId={} for userId={}", id, customer.getId(), userId);
        return customer;
    }

    private Lead findOrThrow(Long id, Long userId) {
        return leadRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new LeadNotFoundException("Lead not found: " + id));
    }

    private LeadDTO toDTO(Lead l) {
        LeadDTO dto = new LeadDTO();
        dto.setId(l.getId());
        dto.setUserId(l.getUserId());
        dto.setName(l.getName());
        dto.setPhone(l.getPhone());
        dto.setEmail(l.getEmail());
        dto.setStage(l.getStage());
        dto.setSource(l.getSource());
        dto.setEstimatedValue(l.getEstimatedValue());
        dto.setNotes(l.getNotes());
        dto.setFollowUpDate(l.getFollowUpDate());
        dto.setCreatedAt(l.getCreatedAt());
        dto.setUpdatedAt(l.getUpdatedAt());
        return dto;
    }
}
