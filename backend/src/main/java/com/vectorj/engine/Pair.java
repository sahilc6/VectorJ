package com.vectorj.engine;

/**
 * A distance-id pair used as a result element for kNN queries.
 * Ordered by distance ascending (nearest first).
 */
public class Pair implements Comparable<Pair> {

    private final float dist;
    private final int id;

    public Pair(float dist, int id) {
        this.dist = dist;
        this.id = id;
    }

    public float getDist() {
        return dist;
    }

    public int getId() {
        return id;
    }

    @Override
    public int compareTo(Pair other) {
        return Float.compare(this.dist, other.dist);
    }

    @Override
    public String toString() {
        return "Pair{dist=" + dist + ", id=" + id + "}";
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Pair pair = (Pair) o;
        return id == pair.id && Float.compare(pair.dist, dist) == 0;
    }

    @Override
    public int hashCode() {
        int result = Float.floatToIntBits(dist);
        result = 31 * result + id;
        return result;
    }
}
