package com.smartbiz.ai.repository;

import com.smartbiz.ai.model.ProductAlias;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProductAliasRepository extends JpaRepository<ProductAlias, Long> {

    Optional<ProductAlias> findByUserIdAndNormalizedAlias(Long userId, String normalizedAlias);

    List<ProductAlias> findByUserIdAndNormalizedAliasIn(Long userId, Collection<String> normalizedAliases);
}
