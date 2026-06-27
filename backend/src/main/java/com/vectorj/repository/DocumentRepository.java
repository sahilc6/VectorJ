package com.vectorj.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vectorj.model.DocItem;

public interface DocumentRepository extends JpaRepository<DocItem, Integer> {
}
