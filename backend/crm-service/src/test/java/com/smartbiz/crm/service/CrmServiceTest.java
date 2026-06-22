package com.smartbiz.crm.service;

import com.smartbiz.crm.model.Customer;
import com.smartbiz.crm.repository.CustomerRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CrmServiceTest {

    @Mock
    CustomerRepository customerRepository;

    @InjectMocks
    CrmService crmService;

    @Test
    void findByUserId_normalizesMissingFiltersBeforeQuerying() {
        Page<Customer> page = new PageImpl<>(List.of());
        when(customerRepository.findWithFilters(anyLong(), anyString(), anyBoolean(), any(Pageable.class)))
            .thenReturn(page);

        crmService.findByUserId(7L, 0, 20, null, null);

        ArgumentCaptor<String> searchCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Boolean> hasDueCaptor = ArgumentCaptor.forClass(Boolean.class);
        verify(customerRepository).findWithFilters(anyLong(), searchCaptor.capture(), hasDueCaptor.capture(), any(Pageable.class));

        assertThat(searchCaptor.getValue()).isEmpty();
        assertThat(hasDueCaptor.getValue()).isFalse();
    }
}
