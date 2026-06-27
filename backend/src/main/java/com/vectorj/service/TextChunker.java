package com.vectorj.service;

import java.util.ArrayList;
import java.util.List;

/**
 * Splits text into overlapping word-based chunks for RAG ingestion.
 */
public class TextChunker {

    private TextChunker() {
        // utility class
    }

    /**
     * Chunk text into overlapping segments.
     *
     * @param text         the full text to chunk
     * @param chunkWords   number of words per chunk
     * @param overlapWords number of overlapping words between consecutive chunks
     * @return list of text chunks
     */
    public static List<String> chunkText(String text, int chunkWords, int overlapWords) {
        String[] words = text.split("\\s+");
        List<String> chunks = new ArrayList<>();
        int step = chunkWords - overlapWords;
        if (step <= 0) step = 1;

        for (int i = 0; i < words.length; i += step) {
            int end = Math.min(i + chunkWords, words.length);
            StringBuilder sb = new StringBuilder();
            for (int j = i; j < end; j++) {
                if (j > i) sb.append(' ');
                sb.append(words[j]);
            }
            chunks.add(sb.toString());
            if (end == words.length) break;
        }

        if (chunks.isEmpty() && !text.isBlank()) {
            chunks.add(text.trim());
        }
        return chunks;
    }
}
