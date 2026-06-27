package com.vectorj.service;

import com.vectorj.engine.*;
import com.vectorj.model.VectorItem;
import com.vectorj.repository.VectorRepository;
import com.vectorj.dto.response.VecSearchHit;
import com.vectorj.dto.response.VecSearchResponse;
import com.vectorj.dto.response.VecBenchmarkResponse;
import jakarta.annotation.PostConstruct;
import jakarta.transaction.Transactional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Core vector database service managing the demo 16-D vector collection.
 * Maintains three index structures (BruteForce, KDTree, HNSW) in sync.
 */
@Service
public class VectorDBService {

    private final Map<Integer, VectorItem> store = new ConcurrentHashMap<>();
    private final BruteForce bf = new BruteForce();
    private KDTree kdt;
    private final HNSW hnsw = new HNSW(6, 50);
    private final VectorRepository vectorItemRepo;

    public VectorDBService(VectorRepository vectorItemRepo) {
        this.vectorItemRepo = vectorItemRepo;
    }

    @Value("${vectorj.demo-dims}")
    private int dims;

    @PostConstruct
    public void init() {

        List<VectorItem> all = vectorItemRepo.findAll();

        if (!all.isEmpty() && all.get(0).getEmbedding() != null) {
            dims = all.get(0).getEmbedding().length;
        } else {
            if (dims == 0)
                dims = 384;
        }

        kdt = new KDTree(dims);
        DistanceMetrics.DistFn dist = DistanceMetrics.getDistFn("euclidean");

        for (VectorItem v : all) {
            store.put(v.getId(), v);
            bf.insert(v);
            kdt.insert(v);
            hnsw.insert(v, dist);
        }

        System.out.println("Loaded " + all.size() + " vectors from PostgreSQL.");
    }

    // ─── CRUD ───────────────────────────────────────────────────────────

    @Transactional
    public int insert(String meta, String cat, float[] emb, DistanceMetrics.DistFn dist) {

        if (dims == 0)
            dims = emb.length;

        VectorItem item = new VectorItem(meta, cat, emb);

        VectorItem savedItem = vectorItemRepo.save(item);
        int id = savedItem.getId();

        store.put(id, savedItem);
        bf.insert(savedItem);
        kdt.insert(savedItem);
        hnsw.insert(savedItem, dist);

        return id;
    }

    @Transactional
    public boolean remove(int id) {

        VectorItem removed = store.remove(id);
        if (removed == null)
            return false;

        vectorItemRepo.deleteById(id);
        bf.remove(id);
        hnsw.remove(id);

        // Rebuild KD-Tree (no efficient single-node deletion)
        kdt = new KDTree(dims);
        kdt.rebuild(new ArrayList<>(store.values()));

        return true;
    }

    public VecSearchResponse search(float[] q, int k, String metric, String algo) {
        DistanceMetrics.DistFn dist = DistanceMetrics.getDistFn(metric);

        long t0 = System.nanoTime();
        List<Pair> pairs;
        String usedAlgo = algo;

        switch (algo != null ? algo.toLowerCase() : "hnsw") {
            case "brute":
            case "bruteforce":
                pairs = bf.knn(q, k, dist);
                usedAlgo = "brute";
                break;
            case "kdtree":
            case "kd":
                pairs = kdt.knn(q, k, dist);
                usedAlgo = "kdtree";
                break;
            case "hnsw":
            default:
                pairs = hnsw.knn(q, k, Math.max(k * 2, 50), dist);
                usedAlgo = "hnsw";
                break;
        }
        long latencyUs = (System.nanoTime() - t0) / 1000;

        List<VecSearchHit> hits = new ArrayList<>();
        for (Pair p : pairs) {
            VectorItem v = store.get(p.getId());
            if (v != null) {
                hits.add(new VecSearchHit(v.getId(), v.getMetadata(), v.getCategory(), v.getEmbedding(),
                        p.getDist()));
            }
        }

        return new VecSearchResponse(hits, latencyUs, usedAlgo, metric != null ? metric : "euclidean");
    }

    public VecBenchmarkResponse benchmark(float[] q, int k, String metric) {
        DistanceMetrics.DistFn dist = DistanceMetrics.getDistFn(metric);

        // Brute force
        long t0 = System.nanoTime();
        List<Pair> bfRes = bf.knn(q, k, dist);
        long bfUs = (System.nanoTime() - t0) / 1000;

        // KD-Tree
        t0 = System.nanoTime();
        List<Pair> kdRes = kdt.knn(q, k, dist);
        long kdUs = (System.nanoTime() - t0) / 1000;

        // HNSW
        t0 = System.nanoTime();
        List<Pair> hnRes = hnsw.knn(q, k, Math.max(k * 2, 50), dist);
        long hnUs = (System.nanoTime() - t0) / 1000;

        return new VecBenchmarkResponse(
                buildHits(bfRes), bfUs,
                buildHits(kdRes), kdUs,
                buildHits(hnRes), hnUs,
                metric != null ? metric : "euclidean",
                store.size());
    }

    private List<VecSearchHit> buildHits(List<Pair> pairs) {
        List<VecSearchHit> hits = new ArrayList<>();
        for (Pair p : pairs) {
            VectorItem v = store.get(p.getId());
            if (v != null) {
                hits.add(new VecSearchHit(v.getId(), v.getMetadata(), v.getCategory(), v.getEmbedding(),
                        p.getDist()));
            }
        }
        return hits;
    }

    public List<VectorItem> all() {
        return new ArrayList<>(store.values());
    }

    public HNSW.GraphInfo hnswInfo() {
        return hnsw.getInfo();
    }

    public int size() {
        return store.size();
    }

    public int getDims() {
        return dims;
    }

}