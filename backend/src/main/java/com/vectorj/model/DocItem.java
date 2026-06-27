package com.vectorj.model;

import java.util.Arrays;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import org.hibernate.annotations.JdbcTypeCode;

@Entity
@Table(name = "doc_items")
public class DocItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String text;

    // CRITICAL: Tells Hibernate how to save this array in Postgres
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "real[]")
    private float[] embedding;

    public DocItem() {
    }

    // NEW: Constructor for inserting new documents (ID is auto-generated)
    public DocItem(String title, String text, float[] embedding) {
        this.title = title;
        this.text = text;
        this.embedding = embedding;
    }

    // Existing all-args constructor
    public DocItem(int id, String title, String text, float[] embedding) {
        this.id = id;
        this.title = title;
        this.text = text;
        this.embedding = embedding;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public float[] getEmbedding() {
        return embedding;
    }

    public void setEmbedding(float[] embedding) {
        this.embedding = embedding;
    }

    @Override
    public String toString() {
        return "DocItem{id=" + id + ", title='" + title + "', text='" + text +
                "', embedding=" + Arrays.toString(embedding) + "}";
    }
}