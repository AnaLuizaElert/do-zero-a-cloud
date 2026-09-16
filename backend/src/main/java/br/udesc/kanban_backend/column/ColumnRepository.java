package br.udesc.kanban_backend.column;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ColumnRepository extends JpaRepository<BoardColumn, UUID> {

    List<BoardColumn> findByBoard_IdOrderByPositionAsc(UUID boardId);
}
