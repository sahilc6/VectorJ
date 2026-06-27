package com.vectorj.controller;

import com.vectorj.dto.response.DocSearchHit;
import com.vectorj.dto.request.DocInsertRequest;
import com.vectorj.dto.request.DocSearchRequest;
import com.vectorj.model.DocItem;
import com.vectorj.service.DocumentDBService;
import com.vectorj.service.OllamaService;
import com.vectorj.service.TextChunker;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/doc")
public class DocumentController {

    private final DocumentDBService documentDBService;
    private final OllamaService ollamaService;

    public DocumentController(DocumentDBService documentDBService, OllamaService ollamaService) {
        this.documentDBService = documentDBService;
        this.ollamaService = ollamaService;
    }

    @GetMapping("/list")
    public List<DocItem> listDocuments() {
        return documentDBService.all();
    }

    @PostMapping("/insert")
    public Map<String, Object> insertDocument(@RequestBody DocInsertRequest req) {
        List<String> chunks = TextChunker.chunkText(req.text, 100, 20);
        List<Integer> insertedIds = new ArrayList<>();

        for (int i = 0; i < chunks.size(); i++) {
            String chunkText = chunks.get(i);
            float[] embedding = ollamaService.embed(chunkText);
            String title = chunks.size() > 1 ? req.title + " (Part " + (i + 1) + ")" : req.title;
            int id = documentDBService.insert(title, chunkText, embedding);
            insertedIds.add(id);
        }

        return Map.of("success", true, "ids", insertedIds);
    }

    @DeleteMapping("/delete/{id}")
    public Map<String, Object> deleteDocument(@PathVariable int id) {
        boolean removed = documentDBService.remove(id);
        return Map.of("success", removed);
    }

    @PostMapping("/search")
    public Map<String, Object> searchDocuments(@RequestBody DocSearchRequest req) {
        float[] queryEmb = ollamaService.embed(req.question);
        List<DocSearchHit> hits = documentDBService.search(queryEmb, req.k, 0f);

        List<Map<String, Object>> hitList = hits.stream().map(hit -> Map.<String, Object>of(
                "id", hit.getItem().getId(),
                "title", hit.getItem().getTitle(),
                "text", hit.getItem().getText(),
                "distance", hit.getDistance())).collect(Collectors.toList());

        return Map.of(
                "queryEmbedding", queryEmb,
                "hits", hitList);
    }

    @PostMapping("/ask")
    public Map<String, Object> askAI(@RequestBody DocSearchRequest req) {
        float[] queryEmb = ollamaService.embed(req.question);
        List<DocSearchHit> hits = documentDBService.search(queryEmb, req.k, 0f);

        // Construct Context for prompt
        StringBuilder contextBuilder = new StringBuilder();
        List<Map<String, String>> contexts = new ArrayList<>();

        for (int i = 0; i < hits.size(); i++) {
            DocItem item = hits.get(i).getItem();
            contextBuilder.append("[").append(i + 1).append("] ")
                    .append("Document: ").append(item.getTitle()).append("\n")
                    .append("Content: ").append(item.getText()).append("\n\n");

            contexts.add(Map.of(
                    "title", item.getTitle(),
                    "text", item.getText()));
        }

        String prompt = "You are a helpful AI assistant. Use the provided context blocks to answer the user's question if they are relevant. "
                +
                "If the question is a general greeting, a basic fact, or cannot be answered using the context, you may rely on your own general knowledge to answer it. "
                +
                "If you truly don't know the answer, say so.\n\n" +
                "Context:\n" + contextBuilder.toString() +
                "Question: " + req.question + "\n\n" +
                "Answer:";

        String answer = ollamaService.generate(prompt);

        return Map.of(
                "answer", answer,
                "contexts", contexts);
    }

}
