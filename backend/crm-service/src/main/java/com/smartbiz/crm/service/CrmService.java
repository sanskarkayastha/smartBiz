package com.smartbiz.crm.service;

import com.smartbiz.crm.dto.CreateCustomerRequest;
import com.smartbiz.crm.dto.CustomerDTO;
import com.smartbiz.crm.dto.PagedResponse;
import com.smartbiz.crm.dto.UpdateCustomerRequest;
import com.smartbiz.crm.exception.CustomerNotFoundException;
import com.smartbiz.crm.model.Customer;
import com.smartbiz.crm.repository.CustomerRepository;
import com.smartbiz.crm.repository.ProcessedSalePurchaseRepository;
import com.smartbiz.crm.model.ProcessedSalePurchase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import com.smartbiz.payment.PlanAccessClient;

@Service
@RequiredArgsConstructor
@Slf4j
public class CrmService {
    private static final String CACHE_NAME = "customers";

    private final CustomerRepository customerRepository;
    private final PlanAccessClient planAccessClient;
    private final ProcessedSalePurchaseRepository processedSalePurchaseRepository;

    @Cacheable(value = CACHE_NAME, key = "#userId + ':' + #page + ':' + #size + ':' + #search + ':' + #hasDue")
    public PagedResponse<CustomerDTO> findByUserId(Long userId, int page, int size, String search, Boolean hasDue) {
        int clampedSize = Math.min(size, 100);
        Pageable pageable = PageRequest.of(page, clampedSize, Sort.by("createdAt").descending());
        String s = (search != null && !search.isBlank()) ? search.trim() : "";
        boolean dueOnly = Boolean.TRUE.equals(hasDue);
        return PagedResponse.of(
            customerRepository.findWithFilters(userId, s, dueOnly, pageable).map(this::toDTO)
        );
    }

    public CustomerDTO findByIdAndUserId(Long id, Long userId) {
        return toDTO(customerRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new CustomerNotFoundException("Customer not found: " + id)));
    }

    @Transactional
    @CacheEvict(value = CACHE_NAME, allEntries = true)
    public CustomerDTO create(Long userId, CreateCustomerRequest request) {
        planAccessClient.requireWithinLimit(userId, "Customers", customerRepository.countByUserId(userId), 100);
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
    @CacheEvict(value = CACHE_NAME, allEntries = true)
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
    @CacheEvict(value = CACHE_NAME, allEntries = true)
    public void deleteCustomer(Long id, Long userId) {
        Customer customer = customerRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new CustomerNotFoundException("Customer not found: " + id));
        customerRepository.delete(customer);
        log.info("Deleted customerId={} for userId={}", id, userId);
    }

    @Transactional
    @CacheEvict(value = CACHE_NAME, allEntries = true)
    public void updatePurchaseTotal(Long userId, Long customerId, BigDecimal amount) {
        customerRepository.findByIdAndUserId(customerId, userId).ifPresent(customer -> {
            customer.setTotalPurchases(customer.getTotalPurchases().add(amount));
            customer.setLastPurchaseDate(LocalDateTime.now());
            customerRepository.save(customer);
            log.info("Updated purchase total for customerId={} by {}", customerId, amount);
        });
    }

    @Transactional
    @CacheEvict(value = CACHE_NAME, allEntries = true)
    public void updatePurchaseTotalExactlyOnce(Long userId, Long saleId, Long customerId, BigDecimal amount) {
        if (processedSalePurchaseRepository.existsByUserIdAndSaleId(userId, saleId)) return;
        Customer customer = customerRepository.findByIdAndUserId(customerId, userId)
            .orElseThrow(() -> new CustomerNotFoundException("Customer not found: " + customerId));
        processedSalePurchaseRepository.save(ProcessedSalePurchase.builder()
            .userId(userId).saleId(saleId).customerId(customerId).amount(amount).build());
        customer.setTotalPurchases(customer.getTotalPurchases().add(amount));
        customer.setLastPurchaseDate(LocalDateTime.now());
        customerRepository.save(customer);
        log.info("Applied sale {} to customer {} exactly once", saleId, customerId);
    }

    @Transactional
    @CacheEvict(value = CACHE_NAME, allEntries = true)
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
