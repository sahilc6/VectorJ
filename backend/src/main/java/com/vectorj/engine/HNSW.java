package com.vectorj.engine;

import com.vectorj.model.VectorItem;

import java.util.*;

/**
 * Hierarchical Navigable Small World (HNSW) graph for approximate nearest-neighbour search.
 * <p>
 * This is a full, from-scratch implementation of the HNSW algorithm as described by
 * Malkov &amp; Yashunin (2018).  The graph is a multi-layer structure where each layer
 * is a navigable small-world graph and higher layers are progressively sparser.
 */
public class HNSW {

    // ─── inner Node class ───────────────────────────────────────────────

    static class Node {
        VectorItem item;
        int maxLyr;
        List<List<Integer>> nbrs; // nbrs.get(layer) -> list of neighbour ids

        Node(VectorItem item, int maxLyr) {
            this.item = item;
            this.maxLyr = maxLyr;
            this.nbrs = new ArrayList<>();
            for (int i = 0; i <= maxLyr; i++) {
                this.nbrs.add(new ArrayList<>());
            }
        }
    }

    // ─── graph state ────────────────────────────────────────────────────

    private final Map<Integer, Node> G = new HashMap<>();
    private final int M;       // max neighbours per layer (except layer 0)
    private final int M0;      // max neighbours on layer 0 = 2*M
    private final int efBuild; // ef parameter used during construction
    private final float mL;    // level generation factor = 1 / ln(M)
    private int topLayer = -1;
    private int entryPt = -1;
    private final Random rng = new Random();

    // ─── constructor ────────────────────────────────────────────────────

    public HNSW(int m, int efBuild) {
        this.M = m;
        this.M0 = 2 * m;
        this.efBuild = efBuild;
        this.mL = 1.0f / (float) Math.log(m);
    }

    // ─── random level assignment ────────────────────────────────────────

    int randLevel() {
        return (int) (-Math.log(rng.nextDouble()) * mL);
    }

    // ─── searchLayer ────────────────────────────────────────────────────

    /**
     * Greedy search on a single layer.  Returns the ef closest candidates.
     */
    public List<Pair> searchLayer(float[] q, int ep, int ef, int lyr, DistanceMetrics.DistFn dist) {
        Set<Integer> visited = new HashSet<>();
        // min-heap for candidates (closest first)
        PriorityQueue<Pair> candidates = new PriorityQueue<>();
        // max-heap for results (farthest first)
        PriorityQueue<Pair> results = new PriorityQueue<>((a, b) -> Float.compare(b.getDist(), a.getDist()));

        float d = dist.dist(q, G.get(ep).item.getEmbedding());
        candidates.add(new Pair(d, ep));
        results.add(new Pair(d, ep));
        visited.add(ep);

        while (!candidates.isEmpty()) {
            Pair c = candidates.poll();
            float farthest = results.peek().getDist();

            if (c.getDist() > farthest) break; // all remaining candidates are farther

            Node node = G.get(c.getId());
            if (node == null) continue;
            List<Integer> neighbors = (lyr < node.nbrs.size()) ? node.nbrs.get(lyr) : Collections.emptyList();

            for (int nId : neighbors) {
                if (visited.contains(nId)) continue;
                visited.add(nId);

                Node nNode = G.get(nId);
                if (nNode == null) continue;

                float nd = dist.dist(q, nNode.item.getEmbedding());
                farthest = results.peek().getDist();

                if (results.size() < ef || nd < farthest) {
                    candidates.add(new Pair(nd, nId));
                    results.add(new Pair(nd, nId));
                    if (results.size() > ef) {
                        results.poll(); // drop the farthest
                    }
                }
            }
        }

        List<Pair> out = new ArrayList<>(results);
        Collections.sort(out); // ascending by distance
        return out;
    }

    // ─── selectNbrs (simple heuristic) ──────────────────────────────────

    List<Integer> selectNbrs(List<Pair> cands, int maxM) {
        Collections.sort(cands); // nearest first
        List<Integer> selected = new ArrayList<>();
        for (Pair p : cands) {
            if (selected.size() >= maxM) break;
            selected.add(p.getId());
        }
        return selected;
    }

    // ─── insert ─────────────────────────────────────────────────────────

    public void insert(VectorItem item, DistanceMetrics.DistFn dist) {
        int id = item.getId();
        int level = randLevel();
        Node node = new Node(item, level);
        G.put(id, node);

        if (G.size() == 1) {
            // First node ever
            topLayer = level;
            entryPt = id;
            return;
        }

        int ep = entryPt;

        // Phase 1: greedily descend from topLayer down to level+1
        for (int lyr = topLayer; lyr > level; lyr--) {
            List<Pair> res = searchLayer(item.getEmbedding(), ep, 1, lyr, dist);
            if (!res.isEmpty()) {
                ep = res.get(0).getId();
            }
        }

        // Phase 2: insert into layers min(topLayer, level) down to 0
        for (int lyr = Math.min(topLayer, level); lyr >= 0; lyr--) {
            List<Pair> res = searchLayer(item.getEmbedding(), ep, efBuild, lyr, dist);
            int maxM = (lyr == 0) ? M0 : M;
            List<Integer> neighbors = selectNbrs(res, maxM);

            // Connect this node to neighbours
            node.nbrs.get(lyr).addAll(neighbors);

            // Back-connect: add this node as neighbour of each selected neighbour
            for (int nId : neighbors) {
                Node nNode = G.get(nId);
                if (nNode == null) continue;
                // Ensure the neighbour has enough layer lists
                while (nNode.nbrs.size() <= lyr) {
                    nNode.nbrs.add(new ArrayList<>());
                }
                nNode.nbrs.get(lyr).add(id);

                // Trim if over capacity
                if (nNode.nbrs.get(lyr).size() > maxM) {
                    // Re-rank and keep only the closest maxM
                    List<Pair> nCands = new ArrayList<>();
                    for (int cId : nNode.nbrs.get(lyr)) {
                        Node cNode = G.get(cId);
                        if (cNode == null) continue;
                        float d = dist.dist(nNode.item.getEmbedding(), cNode.item.getEmbedding());
                        nCands.add(new Pair(d, cId));
                    }
                    nNode.nbrs.set(lyr, selectNbrs(nCands, maxM));
                }
            }

            if (!res.isEmpty()) {
                ep = res.get(0).getId();
            }
        }

        // Update entry point if the new node's level is higher
        if (level > topLayer) {
            topLayer = level;
            entryPt = id;
        }
    }

    // ─── knn ────────────────────────────────────────────────────────────

    public List<Pair> knn(float[] q, int k, int ef, DistanceMetrics.DistFn dist) {
        if (G.isEmpty()) return Collections.emptyList();

        int ep = entryPt;

        // Descend greedily from topLayer to layer 1
        for (int lyr = topLayer; lyr >= 1; lyr--) {
            List<Pair> res = searchLayer(q, ep, 1, lyr, dist);
            if (!res.isEmpty()) {
                ep = res.get(0).getId();
            }
        }

        // Search layer 0 with ef
        List<Pair> res = searchLayer(q, ep, Math.max(ef, k), 0, dist);

        // Return only the top k
        if (res.size() > k) {
            res = res.subList(0, k);
        }
        return res;
    }

    // ─── remove ─────────────────────────────────────────────────────────

    public void remove(int id) {
        Node node = G.remove(id);
        if (node == null) return;

        // Remove this id from all neighbours' adjacency lists
        for (Node n : G.values()) {
            for (List<Integer> layer : n.nbrs) {
                layer.remove(Integer.valueOf(id));
            }
        }

        // If we removed the entry point, pick a new one
        if (entryPt == id) {
            if (G.isEmpty()) {
                entryPt = -1;
                topLayer = -1;
            } else {
                // Pick the node with the highest layer
                int bestId = -1;
                int bestLyr = -1;
                for (Map.Entry<Integer, Node> e : G.entrySet()) {
                    if (e.getValue().maxLyr > bestLyr) {
                        bestLyr = e.getValue().maxLyr;
                        bestId = e.getKey();
                    }
                }
                entryPt = bestId;
                topLayer = bestLyr;
            }
        }
    }

    // ─── graph introspection (for visualization) ────────────────────────

    public GraphInfo getInfo() {
        List<GraphInfo.NodeView> nodes = new ArrayList<>();
        List<GraphInfo.EdgeView> edges = new ArrayList<>();
        Set<String> edgeSet = new HashSet<>();

        for (Map.Entry<Integer, Node> entry : G.entrySet()) {
            int id = entry.getKey();
            Node node = entry.getValue();
            nodes.add(new GraphInfo.NodeView(id, node.item.getMetadata(), node.maxLyr, node.item.getEmbedding()));

            for (int lyr = 0; lyr < node.nbrs.size(); lyr++) {
                for (int nId : node.nbrs.get(lyr)) {
                    String key = Math.min(id, nId) + "-" + Math.max(id, nId) + "-" + lyr;
                    if (edgeSet.add(key)) {
                        edges.add(new GraphInfo.EdgeView(id, nId, lyr));
                    }
                }
            }
        }

        return new GraphInfo(nodes, edges, topLayer, entryPt, G.size());
    }

    public int size() {
        return G.size();
    }

    public Map<Integer, Node> getGraph() {
        return G;
    }

    // ─── GraphInfo DTOs ─────────────────────────────────────────────────

    public static class GraphInfo {
        private final List<NodeView> nodes;
        private final List<EdgeView> edges;
        private final int topLayer;
        private final int entryPoint;
        private final int totalNodes;

        public GraphInfo(List<NodeView> nodes, List<EdgeView> edges, int topLayer, int entryPoint, int totalNodes) {
            this.nodes = nodes;
            this.edges = edges;
            this.topLayer = topLayer;
            this.entryPoint = entryPoint;
            this.totalNodes = totalNodes;
        }

        public List<NodeView> getNodes() { return nodes; }
        public List<EdgeView> getEdges() { return edges; }
        public int getTopLayer() { return topLayer; }
        public int getEntryPoint() { return entryPoint; }
        public int getTotalNodes() { return totalNodes; }

        public static class NodeView {
            private final int id;
            private final String metadata;
            private final int layer;
            private final float[] embedding;

            public NodeView(int id, String metadata, int layer, float[] embedding) {
                this.id = id;
                this.metadata = metadata;
                this.layer = layer;
                this.embedding = embedding;
            }

            public int getId() { return id; }
            public String getMetadata() { return metadata; }
            public int getLayer() { return layer; }
            public float[] getEmbedding() { return embedding; }
        }

        public static class EdgeView {
            private final int source;
            private final int target;
            private final int layer;

            public EdgeView(int source, int target, int layer) {
                this.source = source;
                this.target = target;
                this.layer = layer;
            }

            public int getSource() { return source; }
            public int getTarget() { return target; }
            public int getLayer() { return layer; }
        }
    }
}
