package com.vectorj.dto.response;

public class VecSearchHit {
    private final int id;
    private final String metadata;
    private final String category;
    private final float[] embedding;
    private final float distance;

    public VecSearchHit(int id, String metadata, String category, float[] embedding, float distance) {
        this.id = id;
        this.metadata = metadata;
        this.category = category;
        this.embedding = embedding;
        this.distance = distance;
    }

    public int getId() {
        return id;
    }

    public String getMetadata() {
        return metadata;
    }

    public String getCategory() {
        return category;
    }

    public float[] getEmbedding() {
        return embedding;
    }

    public float getDistance() {
        return distance;
    }
}