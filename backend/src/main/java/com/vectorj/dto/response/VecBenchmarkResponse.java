package com.vectorj.dto.response;

import java.util.List;

public class VecBenchmarkResponse {
    private final List<VecSearchHit> bruteHits;
    private final long bruteUs;
    private final List<VecSearchHit> kdtreeHits;
    private final long kdtreeUs;
    private final List<VecSearchHit> hnswHits;
    private final long hnswUs;
    private final String metric;
    private final int totalVectors;

    public VecBenchmarkResponse(List<VecSearchHit> bruteHits, long bruteUs,
            List<VecSearchHit> kdtreeHits, long kdtreeUs,
            List<VecSearchHit> hnswHits, long hnswUs,
            String metric, int totalVectors) {
        this.bruteHits = bruteHits;
        this.bruteUs = bruteUs;
        this.kdtreeHits = kdtreeHits;
        this.kdtreeUs = kdtreeUs;
        this.hnswHits = hnswHits;
        this.hnswUs = hnswUs;
        this.metric = metric;
        this.totalVectors = totalVectors;
    }

    public List<VecSearchHit> getBruteHits() {
        return bruteHits;
    }

    public long getBruteUs() {
        return bruteUs;
    }

    public List<VecSearchHit> getKdtreeHits() {
        return kdtreeHits;
    }

    public long getKdtreeUs() {
        return kdtreeUs;
    }

    public List<VecSearchHit> getHnswHits() {
        return hnswHits;
    }

    public long getHnswUs() {
        return hnswUs;
    }

    public String getMetric() {
        return metric;
    }

    public int getTotalVectors() {
        return totalVectors;
    }
}