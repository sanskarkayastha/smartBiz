package com.smartbiz.crm.service;

import com.smartbiz.crm.dto.CreateCustomerRequest;
import com.smartbiz.crm.dto.CustomerDTO;
import com.smartbiz.crm.dto.UpdateCustomerRequest;
import com.smartbiz.crm.exception.CustomerNotFoundException;
import com.smartbiz.crm.model.Customer;
import com.smartbiz.crm.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CrmService {

    private final CustomerRepository customerRepository;

    public List<CustomerDTO> findByUserId(Long userId) {
        return customerRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public CustomerDTO findByIdAndUserId(Long id, Long userId) {
        return toDTO(customerRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new CustomerNotFoundException("Customer not found: " + id)));
    }

    @Transactional
    public CustomerDTO create(Long userId, CreateCustomerRequest request) {
        Customer customer = new Customer();
        customer.setUserId(userId);
        customer.setName(request.getName());
        customer.setPhone(request.getPhone());
        customer.setEmail(request.getEmail());
        customer.setAddress(request.getAddress());
        customer.setLeadStatus(request.getLeadStatus());
        customer.setNotes(request.getNotes());
        customer.setTotalPurchases(BigDecimal.ZERO);
        log.info("Creating customer: {} for userId: {}", request.getName(), userId);
        return toDTO(customerRepository.save(customer));
    }

    @Transactional
    public CustomerDTO update(Long id, Long userId, UpdateCustomerRequest request) {
        Customer customer = customerRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new CustomerNotFoundException("Customer not found: " + id));

        if (request.getName() != null) customer.setName(request.getName());
        if (request.getPhone() != null) customer.setPhone(request.getPhone());
        if (request.getEmail() != null) customer.setEmail(request.getEmail());
        if (request.getAddress() != null) customer.setAddress(request.getAddress());
        if (request.getLeadStatus() != null) customer.setLeadStatus(request.getLeadStatus());
        if (request.getNotes() != null) customer.setNotes(request.getNotes());

        return toDTO(customerRepository.save(customer));
    }

    @Transactional
    public void deleteCustomer(Long id, Long userId) {
        Customer customer = customerRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new CustomerNotFoundException("Customer not found: " + id));
        customerRepository.delete(customer);
        log.info("Deleted customerId={} for userId={}", id, userId);
    }

    @Transactional
    public void updatePurchaseTotal(Long userId, Long customerId, BigDecimal amount) {
        customerRepository.findByIdAndUserId(customerId, userId).ifPresent(customer -> {
            customer.setTotalPurchases(customer.getTotalPurchases().add(amount));
            customer.setLastPurchaseDate(LocalDateTime.now());
            customerRepository.save(customer);
            log.info("Updated purchase total for customerId={} by {}", customerId, amount);
        });
    }

    @Transactional
    public void addDueAmount(Long userId, Long customerId, BigDecimal amount) {
        customerRepository.findByIdAndUserId(customerId, userId).ifPresent(customer -> {
            BigDecimal current = customer.getDueAmount() != null ? customer.getDueAmount() : BigDecimal.ZERO;
            customer.setDueAmount(current.add(amount));
            customerRepository.save(customer);
            log.info("Added due amount {} for customerId={}", amount, customerId);
        });
    }

    public List<CustomerDTO> getCustomersWithDue(Long userId) {
        return customerRepository.findByUserIdAndDueAmountGreaterThan(userId, BigDecimal.ZERO)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    private CustomerDTO toDTO(Customer c) {
        CustomerDTO dto = new CustomerDTO();
        dto.setId(c.getId());
        dto.setUserId(c.getUserId());
        dto.setName(c.getName());
        dto.setPhone(c.getPhone());
        dto.setEmail(c.getEmail());
        dto.setAddress(c.getAddress());
        dto.setLeadStatus(c.getLeadStatus());
        dto.setNotes(c.getNotes());
        dto.setTotalPurchases(c.getTotalPurchases());
        dto.setDueAmount(c.getDueAmount() != null ? c.getDueAmount() : BigDecimal.ZERO);
        dto.setLastPurchaseDate(c.getLastPurchaseDate());
        dto.setCreatedAt(c.getCreatedAt());
        dto.setUpdatedAt(c.getUpdatedAt());
        return dto;
    }
}
