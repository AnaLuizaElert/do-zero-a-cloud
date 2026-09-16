package br.udesc.kanban_backend.task.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TaskResponse(
        UUID id,
        String name,
        int position,
        Instant createdAt,
        Instant dueDate,
        boolean completed,
        List<String> tags,
        UUID columnId
) {
}
