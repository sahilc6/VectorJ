package com.vectorj.engine;

import com.vectorj.model.VectorItem;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.PriorityQueue;

/**
 * Brute-force exact nearest-neighbour search.
 * Scans every vector and returns the k closest by the supplied distance function.
 */
public class BruteForce {

    private final List<VectorItem> items = new ArrayList<>();

    public void insert(VectorItem v) {
        items.add(v);
    }

    /**
     * Exact k-nearest-neighbour search.
     * Uses a max-heap of size k so that we can drop far-away items early.
     */
    public List<Pair> knn(float[] q, int k, DistanceMetrics.DistFn dist) {
        // Max-heap: the head is the *farthest* among the current top-k
        PriorityQueue<Pair> maxHeap = new PriorityQueue<>((a, b) -> Float.compare(b.getDist(), a.getDist()));

        for (VectorItem item : items) {
            float d = dist.dist(q, item.getEmbedding());
            if (maxHeap.size() < k) {
                maxHeap.add(new Pair(d, item.getId()));
            } else if (d < maxHeap.peek().getDist()) {
                maxHeap.poll();
                maxHeap.add(new Pair(d, item.getId()));
            }
        }

        List<Pair> result = new ArrayList<>(maxHeap);
        Collections.sort(result); // ascending by distance
        return result;
    }

    public void remove(int id) {
        items.removeIf(v -> v.getId() == id);
    }

    public List<VectorItem> getItems() {
        return items;
    }

    public int size() {
        return items.size();
    }
}
