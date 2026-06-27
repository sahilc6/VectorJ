package com.vectorj.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vectorj.model.VectorItem;

public interface VectorRepository extends JpaRepository<VectorItem, Integer> {

}
