package com.smartbiz.crm.service;

import com.smartbiz.crm.model.Lead;
import com.smartbiz.crm.repository.CustomerRepository;
import com.smartbiz.crm.repository.LeadRepository;
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
class LeadServiceTest {

    @Mock
    LeadRepository leadRepository;

    @Mock
    CustomerRepository customerRepository;

    @Mock
    CrmService crmService;

    @InjectMocks
    LeadService leadService;

    @Test
    void getLeads_normalizesMissingFiltersBeforeQuerying() {
        Page<Lead> page = new PageImpl<>(List.of());
        when(leadRepository.findWithFilters(anyLong(), anyString(), anyString(), anyString(), anyBoolean(), any(Pageable.class)))
            .thenReturn(page);

        leadService.getLeads(9L, 0, 20, null, null, null, null);

        ArgumentCaptor<String> searchCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> stageCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> sourceCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Boolean> overdueCaptor = ArgumentCaptor.forClass(Boolean.class);
        verify(leadRepository).findWithFilters(
            anyLong(),
            searchCaptor.capture(),
            stageCaptor.capture(),
            sourceCaptor.capture(),
            overdueCaptor.capture(),
            any(Pageable.class)
        );

        assertThat(searchCaptor.getValue()).isEmpty();
        assertThat(stageCaptor.getValue()).isEmpty();
        assertThat(sourceCaptor.getValue()).isEmpty();
        assertThat(overdueCaptor.getValue()).isFalse();
    }
}
