package com.vectorj.dto.response;

import com.vectorj.model.DocItem;

public class DocSearchHit {
    private final float distance;
    private final DocItem item;

    public DocSearchHit(float distance, DocItem item) {
        this.distance = distance;
        this.item = item;
    }

    public float getDistance() {
        return distance;
    }

    public DocItem getItem() {
        return item;
    }
}
