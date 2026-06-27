package com.vectorj;

import com.vectorj.engine.BruteForce;
import com.vectorj.engine.DistanceMetrics;
import com.vectorj.engine.HNSW;
import com.vectorj.engine.KDTree;
import com.vectorj.model.VectorItem;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class BenchmarkRunner {

    public static void main(String[] args) {
        int[] sizes = {1000, 10000, 100000};
        int dims = 16;
        int k = 10;
        DistanceMetrics.DistFn dist = DistanceMetrics.getDistFn("euclidean");
        Random rng = new Random(42);

        System.out.println("| Dataset Size | Brute Force | KD Tree | HNSW   |");
        System.out.println("| :----------- | :---------- | :------ | :----- |");

        for (int size : sizes) {
            List<VectorItem> items = new ArrayList<>();
            for (int i = 0; i < size; i++) {
                float[] vec = new float[dims];
                for (int d = 0; d < dims; d++) vec[d] = rng.nextFloat();
                items.add(new VectorItem(i, "meta" + i, "cat", vec));
            }

            // Build BruteForce
            BruteForce bf = new BruteForce();
            for (VectorItem item : items) bf.insert(item);

            // Build KDTree
            KDTree kd = new KDTree(dims);
            kd.rebuild(items);

            // Build HNSW
            HNSW hnsw = new HNSW(16, 100);
            for (VectorItem item : items) hnsw.insert(item, dist);

            // Generate queries
            int numQueries = 100;
            List<float[]> queries = new ArrayList<>();
            for (int i = 0; i < numQueries; i++) {
                float[] q = new float[dims];
                for (int d = 0; d < dims; d++) q[d] = rng.nextFloat();
                queries.add(q);
            }

            // Benchmark BruteForce
            long startBf = System.nanoTime();
            for (float[] q : queries) bf.knn(q, k, dist);
            long endBf = System.nanoTime();
            double avgBf = (endBf - startBf) / 1_000_000.0 / numQueries;

            // Benchmark KDTree
            long startKd = System.nanoTime();
            for (float[] q : queries) kd.knn(q, k, dist);
            long endKd = System.nanoTime();
            double avgKd = (endKd - startKd) / 1_000_000.0 / numQueries;

            // Benchmark HNSW
            long startHnsw = System.nanoTime();
            for (float[] q : queries) hnsw.knn(q, k, 40, dist);
            long endHnsw = System.nanoTime();
            double avgHnsw = (endHnsw - startHnsw) / 1_000_000.0 / numQueries;

            System.out.printf("| **%s** | %.2f ms | %.2f ms | %.2f ms |\n", 
                    size == 1000 ? "1K" : size == 10000 ? "10K" : "100K", 
                    avgBf, avgKd, avgHnsw);
        }
    }
}
