package br.udesc.kanban_backend.column.dto;

import java.util.UUID;

public record ColumnResponse(UUID id, String name, int position, UUID boardId) {
}
