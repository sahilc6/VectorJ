package com.vectorj.controller;

import com.vectorj.model.VectorItem;
import com.vectorj.service.OllamaService;
import com.vectorj.service.VectorDBService;
import com.vectorj.engine.DistanceMetrics;
import com.vectorj.engine.HNSW;
import com.vectorj.dto.response.VecSearchResponse;
import com.vectorj.dto.response.VecBenchmarkResponse;
import com.vectorj.dto.request.VecInsertRequest;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
public class VectorController {

    private final VectorDBService vectorDBService;
    private final OllamaService ollamaService;

    public VectorController(VectorDBService vectorDBService, OllamaService ollamaService) {
        this.vectorDBService = vectorDBService;
        this.ollamaService = ollamaService;
    }

    @GetMapping("/items")
    public List<VectorItem> getItems() {
        return vectorDBService.all();
    }

    @GetMapping("/search")
    public VecSearchResponse search( // Changed return type from List to the full Response object
            @RequestParam String v,
            @RequestParam int k,
            @RequestParam String metric,
            @RequestParam String algo) {

        float[] query = parseVector(v);
        // Return the whole response so the frontend gets latency and algo info
        return vectorDBService.search(query, k, metric, algo);
    }

    @PostMapping("/insert")
    public Map<String, Object> insert(@RequestBody VecInsertRequest req) { // Uses proper Request DTO
        int id = vectorDBService.insert(
                req.getMetadata(),
                req.getCategory(),
                req.getEmbedding(),
                DistanceMetrics.getDistFn("euclidean"));
        return Map.of("success", true, "id", id);
    }

    @DeleteMapping("/delete/{id}")
    public Map<String, Object> delete(@PathVariable int id) {
        boolean removed = vectorDBService.remove(id);
        return Map.of("success", removed);
    }

    @GetMapping("/benchmark")
    public Map<String, Double> benchmark(
            @RequestParam String v,
            @RequestParam int k,
            @RequestParam String metric) {

        float[] query = parseVector(v);
        // Using the new DTO we created earlier
        VecBenchmarkResponse res = vectorDBService.benchmark(query, k, metric);

        // Convert microseconds to milliseconds
        return Map.of(
                "bruteForce", res.getBruteUs() / 1000.0,
                "kdTree", res.getKdtreeUs() / 1000.0,
                "hnsw", res.getHnswUs() / 1000.0);
    }

    @GetMapping("/hnsw-info")
    public Map<String, Object> getHnswInfo() {
        HNSW.GraphInfo info = vectorDBService.hnswInfo();
        List<Map<String, Object>> layers = new ArrayList<>();
        int topLayer = info.getTopLayer();

        for (int l = 0; l <= topLayer; l++) {
            final int level = l;
            long nodeCount = info.getNodes().stream().filter(n -> n.getLayer() >= level).count();
            long edgeCount = info.getEdges().stream().filter(e -> e.getLayer() == level).count();
            layers.add(Map.of(
                    "level", level,
                    "nodes", nodeCount,
                    "edges", edgeCount));
        }

        return Map.of("layers", layers);
    }

    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        return Map.of(
                "totalVectors", vectorDBService.size(),
                "dimensions", vectorDBService.getDims());
    }

    @GetMapping("/status")
    public Map<String, Object> getStatus() {
        return Map.of(
                "ollama", ollamaService.isAvailable(),
                "model", ollamaService.getGenModel());
    }

    private float[] parseVector(String v) {
        String[] parts = v.split(",");
        float[] query = new float[parts.length];
        for (int i = 0; i < parts.length; i++) {
            query[i] = Float.parseFloat(parts[i].trim());
        }
        return query;
    }
}