package com.vectorj.engine;

/**
 * Distance metric utilities for vector similarity computations.
 */
public final class DistanceMetrics {

    private DistanceMetrics() {
        // utility class
    }

    /**
     * Functional interface for distance functions.
     */
    @FunctionalInterface
    public interface DistFn {
        float dist(float[] a, float[] b);
    }

    /**
     * Euclidean (L2) distance between two vectors.
     */
    public static float euclidean(float[] a, float[] b) {
        float sum = 0;
        int len = Math.min(a.length, b.length);
        for (int i = 0; i < len; i++) {
            float d = a[i] - b[i];
            sum += d * d;
        }
        return (float) Math.sqrt(sum);
    }

    /**
     * Cosine distance (1 - cosine similarity) between two vectors.
     */
    public static float cosine(float[] a, float[] b) {
        float dot = 0, na = 0, nb = 0;
        int len = Math.min(a.length, b.length);
        for (int i = 0; i < len; i++) {
            dot += a[i] * b[i];
            na += a[i] * a[i];
            nb += b[i] * b[i];
        }
        float denom = (float) (Math.sqrt(na) * Math.sqrt(nb));
        if (denom == 0) return 1f;
        return 1f - dot / denom;
    }

    /**
     * Manhattan (L1) distance between two vectors.
     */
    public static float manhattan(float[] a, float[] b) {
        float sum = 0;
        int len = Math.min(a.length, b.length);
        for (int i = 0; i < len; i++) {
            sum += Math.abs(a[i] - b[i]);
        }
        return sum;
    }

    /**
     * Returns the appropriate distance function for the given metric name.
     * Supported: "euclidean", "cosine", "manhattan".
     */
    public static DistFn getDistFn(String metric) {
        if (metric == null) return DistanceMetrics::euclidean;
        switch (metric.toLowerCase()) {
            case "cosine":
                return DistanceMetrics::cosine;
            case "manhattan":
                return DistanceMetrics::manhattan;
            case "euclidean":
            default:
                return DistanceMetrics::euclidean;
        }
    }
}
