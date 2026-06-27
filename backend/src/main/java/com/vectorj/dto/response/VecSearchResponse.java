package com.vectorj.dto.response;

import java.util.List;

public class VecSearchResponse {
    private final List<VecSearchHit> hits;
    private final long latencyUs;
    private final String algo;
    private final String metric;

    // Fixed the constructor name to match the class name
    public VecSearchResponse(List<VecSearchHit> hits, long latencyUs, String algo, String metric) {
        this.hits = hits;
        this.latencyUs = latencyUs;
        this.algo = algo;
        this.metric = metric;
    }

    public List<VecSearchHit> getHits() {
        return hits;
    }

    public long getLatencyUs() {
        return latencyUs;
    }

    public String getAlgo() {
        return algo;
    }

    public String getMetric() {
        return metric;
    }
}