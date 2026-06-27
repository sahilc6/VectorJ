package com.vectorj.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

/**
 * Client service for Ollama LLM/embedding API.
 * Uses Spring WebClient (from webflux) and blocks for synchronous responses.
 */
@Service
public class OllamaService {

    private final WebClient webClient;
    private final String embedModel;
    private final String genModel;

    public OllamaService(
            @Value("${ollama.host}") String host,
            @Value("${ollama.port}") int port,
            @Value("${ollama.embed-model}") String embedModel,
            @Value("${ollama.gen-model}") String genModel) {
        this.embedModel = embedModel;
        this.genModel = genModel;
        this.webClient = WebClient.builder()
                .baseUrl("http://" + host + ":" + port)
                .build();
    }

    /**
     * Check if the Ollama server is reachable.
     */
    public boolean isAvailable() {
        try {
            String resp = webClient.get()
                    .uri("/")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return resp != null;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Generate an embedding vector for the given text.
     */
    @SuppressWarnings("unchecked")
    public float[] embed(String text) {
        Map<String, Object> body = Map.of(
                "model", embedModel,
                "prompt", text
        );

        Map<String, Object> resp = webClient.post()
                .uri("/api/embeddings")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (resp == null || !resp.containsKey("embedding")) {
            throw new RuntimeException("Ollama embedding response missing 'embedding' field");
        }

        List<Number> embList = (List<Number>) resp.get("embedding");
        float[] result = new float[embList.size()];
        for (int i = 0; i < embList.size(); i++) {
            result[i] = embList.get(i).floatValue();
        }
        return result;
    }

    /**
     * Generate a text response for the given prompt.
     */
    @SuppressWarnings("unchecked")
    public String generate(String prompt) {
        Map<String, Object> body = Map.of(
                "model", genModel,
                "prompt", prompt,
                "stream", false
        );

        Map<String, Object> resp = webClient.post()
                .uri("/api/generate")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (resp == null || !resp.containsKey("response")) {
            throw new RuntimeException("Ollama generate response missing 'response' field");
        }

        return (String) resp.get("response");
    }

    public String getEmbedModel() {
        return embedModel;
    }

    public String getGenModel() {
        return genModel;
    }
}
