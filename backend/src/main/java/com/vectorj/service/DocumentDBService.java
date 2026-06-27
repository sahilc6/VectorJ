package com.vectorj.service;

import com.vectorj.engine.*;
import com.vectorj.model.DocItem;
import com.vectorj.repository.DocumentRepository;
import com.vectorj.dto.response.DocSearchHit;
import jakarta.annotation.PostConstruct;
import jakarta.transaction.Transactional;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Document store for the RAG pipeline.
 * Each document is embedded and stored in both HNSW and BruteForce indices.
 */
@Service
public class DocumentDBService {

    private final Map<Integer, DocItem> store = new ConcurrentHashMap<>();
    private HNSW hnsw = new HNSW(6, 50);
    private final BruteForce bf = new BruteForce();
    private int dims = 0;
    private final DocumentRepository documentRepository;

    public DocumentDBService(DocumentRepository documentRepository) {
        this.documentRepository = documentRepository;
    }

    @PostConstruct
    public void init() {
        // 1. Load all documents from the database
        List<DocItem> all = documentRepository.findAll();

        DistanceMetrics.DistFn dist = DistanceMetrics.getDistFn("euclidean");

        for (DocItem d : all) {
            store.put(d.getId(), d);

            // Insert into indices using a dummy VectorItem wrapper
            com.vectorj.model.VectorItem vi = new com.vectorj.model.VectorItem(
                    d.getId(), d.getTitle(), "", d.getEmbedding());

            bf.insert(vi);
            hnsw.insert(vi, dist);
        }

        if (!all.isEmpty() && all.get(0).getEmbedding() != null) {
            dims = all.get(0).getEmbedding().length;
        }
    }

    // ─── operations ─────────────────────────────────────────────────────
    @Transactional
    public int insert(String title, String text, float[] emb) {

        if (dims == 0)
            dims = emb.length;

        DocItem item = new DocItem(title, text, emb);

        documentRepository.save(item); // Save to DB first
        int id = item.getId(); // Get auto-generated ID

        store.put(id, item);
        com.vectorj.model.VectorItem vi = new com.vectorj.model.VectorItem(id, title, "", emb);
        bf.insert(vi);
        hnsw.insert(vi, DistanceMetrics.getDistFn("euclidean"));

        return id;
    }

    public List<DocSearchHit> search(float[] q, int k, float maxDist) {
        if (store.isEmpty())
            return Collections.emptyList();

        DistanceMetrics.DistFn dist = DistanceMetrics.getDistFn("euclidean");
        List<Pair> pairs = hnsw.knn(q, k, Math.max(k * 2, 50), dist);

        List<DocSearchHit> hits = new ArrayList<>();
        for (Pair p : pairs) {
            if (maxDist > 0 && p.getDist() > maxDist)
                continue;
            DocItem d = store.get(p.getId());
            if (d != null) {
                hits.add(new DocSearchHit(p.getDist(), d));
            }
        }
        return hits;
    }

    public boolean remove(int id) {
        DocItem removed = store.remove(id);
        if (removed == null)
            return false;

        bf.remove(id);
        hnsw.remove(id);
        documentRepository.deleteById(id);
        return true;
    }

    public List<DocItem> all() {
        return new ArrayList<>(store.values());
    }

    public int size() {
        return store.size();
    }

    public int getDims() {
        return dims;
    }

}
