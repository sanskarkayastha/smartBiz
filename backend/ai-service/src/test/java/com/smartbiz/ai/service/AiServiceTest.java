package com.smartbiz.ai.service;

import com.smartbiz.ai.dto.AiQueryRequest;
import com.smartbiz.ai.dto.AiQueryResponse;
import com.smartbiz.ai.dto.ParseSalesFileRequest;
import com.smartbiz.ai.dto.ParseSalesFileResponse;
import com.smartbiz.ai.repository.ImportArtifactRepository;
import com.smartbiz.ai.repository.ImportSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AiServiceTest {

    private AiService aiService;

    @BeforeEach
    void setUp() {
        aiService = new AiService(
                new RestTemplate(),
                new com.fasterxml.jackson.databind.ObjectMapper(),
                Mockito.mock(RemoteBusinessClient.class),
                Mockito.mock(InsightService.class),
                Mockito.mock(ImportSessionRepository.class),
                Mockito.mock(ImportArtifactRepository.class)
        );
        ReflectionTestUtils.setField(aiService, "geminiApiKey", "");
        ReflectionTestUtils.setField(aiService, "geminiUrl", "");
    }

    @Test
    void parseSalesFile_supportsBillDateParticularsQtyAndAmountColumns() {
        String fileText = String.join("\n",
                "Business Summary",
                "Bill Date,Particulars,Qty,Amount,Party Name,Mode",
                "2026/5/1,Milk Tea,2,300,Asha,Cash"
        );

        ParseSalesFileResponse response = aiService.parseSalesFile(new ParseSalesFileRequest(fileText));

        assertThat(response.sales()).hasSize(1);
        assertThat(response.sales().getFirst().saleDate()).isEqualTo("2026-05-01");
        assertThat(response.sales().getFirst().customerName()).isEqualTo("Asha");
        assertThat(response.sales().getFirst().paymentMethod()).isEqualTo("CASH");
        assertThat(response.sales().getFirst().items()).hasSize(1);
        assertThat(response.sales().getFirst().items().getFirst().productName()).isEqualTo("Milk Tea");
        assertThat(response.sales().getFirst().items().getFirst().quantity()).isEqualTo(2.0);
        assertThat(response.sales().getFirst().items().getFirst().unitPrice()).isEqualTo(150.0);
    }

    @Test
    void answerQuery_returnsSalesWhenUserAsksToAddSalesFromSpreadsheet() {
        String fileText = String.join("\n",
                "Bill Date,Particulars,Qty,Amount,Party Name,Mode",
                "2026/5/1,Milk Tea,2,300,Asha,Cash"
        );

        AiQueryResponse response = aiService.answerQuery(
                1L,
                List.of(new AiQueryRequest.ChatMessage("user", "Please add these sales from the sheet")),
                null,
                null,
                fileText,
                null
        );

        assertThat(response.products()).isNull();
        assertThat(response.sales()).hasSize(1);
        assertThat(response.response()).contains("historical sale");
    }
}
