package com.vectorj.engine;

import com.vectorj.model.VectorItem;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.PriorityQueue;

/**
 * KD-Tree for approximate nearest-neighbour search in moderate-dimensional spaces.
 * Splits on the dimension with the widest spread at each level.
 */
public class KDTree {

    private KDNode root;
    private final int dims;

    public KDTree(int dims) {
        this.dims = dims;
    }

    // ─── inner node class ───────────────────────────────────────────────

    private static class KDNode {
        VectorItem item;
        KDNode left;
        KDNode right;
        int splitDim;

        KDNode(VectorItem item, int splitDim) {
            this.item = item;
            this.splitDim = splitDim;
        }
    }

    // ─── insert ─────────────────────────────────────────────────────────

    public void insert(VectorItem v) {
        root = insertRec(root, v, 0);
    }

    private KDNode insertRec(KDNode node, VectorItem v, int depth) {
        if (node == null) {
            return new KDNode(v, depth % dims);
        }
        int dim = node.splitDim;
        if (v.getEmbedding()[dim] < node.item.getEmbedding()[dim]) {
            node.left = insertRec(node.left, v, depth + 1);
        } else {
            node.right = insertRec(node.right, v, depth + 1);
        }
        return node;
    }

    // ─── knn ────────────────────────────────────────────────────────────

    public List<Pair> knn(float[] q, int k, DistanceMetrics.DistFn dist) {
        // Max-heap of size k (farthest at head)
        PriorityQueue<Pair> best = new PriorityQueue<>((a, b) -> Float.compare(b.getDist(), a.getDist()));
        knnRec(root, q, k, dist, best);
        List<Pair> result = new ArrayList<>(best);
        Collections.sort(result);
        return result;
    }

    private void knnRec(KDNode node, float[] q, int k, DistanceMetrics.DistFn dist, PriorityQueue<Pair> best) {
        if (node == null) return;

        float d = dist.dist(q, node.item.getEmbedding());
        if (best.size() < k) {
            best.add(new Pair(d, node.item.getId()));
        } else if (d < best.peek().getDist()) {
            best.poll();
            best.add(new Pair(d, node.item.getId()));
        }

        int dim = node.splitDim;
        float diff = q[dim] - node.item.getEmbedding()[dim];
        KDNode first = diff < 0 ? node.left : node.right;
        KDNode second = diff < 0 ? node.right : node.left;

        knnRec(first, q, k, dist, best);

        // Prune: only visit the other subtree if the splitting plane is closer
        // than the current k-th best distance.
        if (best.size() < k || Math.abs(diff) < best.peek().getDist()) {
            knnRec(second, q, k, dist, best);
        }
    }

    // ─── rebuild ────────────────────────────────────────────────────────

    /**
     * Rebuilds the tree from scratch using a balanced median-split strategy.
     */
    public void rebuild(List<VectorItem> items) {
        root = buildBalanced(new ArrayList<>(items), 0);
    }

    private KDNode buildBalanced(List<VectorItem> items, int depth) {
        if (items.isEmpty()) return null;

        int dim = depth % dims;

        // Find the dimension with the widest spread
        int bestDim = dim;
        float bestSpread = -1;
        for (int d = 0; d < dims; d++) {
            float lo = Float.MAX_VALUE, hi = -Float.MAX_VALUE;
            for (VectorItem v : items) {
                float val = v.getEmbedding()[d];
                if (val < lo) lo = val;
                if (val > hi) hi = val;
            }
            float spread = hi - lo;
            if (spread > bestSpread) {
                bestSpread = spread;
                bestDim = d;
            }
        }
        final int splitDim = bestDim;

        // Sort by the chosen dimension and pick the median
        items.sort((a, b) -> Float.compare(a.getEmbedding()[splitDim], b.getEmbedding()[splitDim]));
        int mid = items.size() / 2;

        KDNode node = new KDNode(items.get(mid), splitDim);
        node.left = buildBalanced(items.subList(0, mid), depth + 1);
        node.right = buildBalanced(items.subList(mid + 1, items.size()), depth + 1);
        return node;
    }
}
