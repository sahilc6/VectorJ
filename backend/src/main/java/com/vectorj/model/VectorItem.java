package com.vectorj.model;

import java.util.Arrays;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "vector_items")
public class VectorItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private String metadata;
    private String category;

    // CRITICAL: Tells Hibernate how to save this array in Postgres
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "real[]")
    private float[] embedding;

    public VectorItem() {
    }

    // NEW: Constructor for inserting new vectors (ID is auto-generated)
    public VectorItem(String metadata, String category, float[] embedding) {
        this.metadata = metadata;
        this.category = category;
        this.embedding = embedding;
    }

    // Existing all-args constructor
    public VectorItem(int id, String metadata, String category, float[] embedding) {
        this.id = id;
        this.metadata = metadata;
        this.category = category;
        this.embedding = embedding;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getMetadata() {
        return metadata;
    }

    public void setMetadata(String metadata) {
        this.metadata = metadata;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public float[] getEmbedding() {
        return embedding;
    }

    public void setEmbedding(float[] embedding) {
        this.embedding = embedding;
    }

    @Override
    public String toString() {
        return "VectorItem{id=" + id + ", metadata='" + metadata + "', category='" + category +
                "', embedding=" + Arrays.toString(embedding) + "}";
    }
}