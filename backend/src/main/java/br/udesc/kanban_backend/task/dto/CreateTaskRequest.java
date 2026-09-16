package br.udesc.kanban_backend.task.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CreateTaskRequest(
        @NotBlank(message = "O nome é obrigatório")
        @Size(max = 120, message = "O nome deve ter no máximo 120 caracteres")
        String name,

        @NotNull(message = "A posição é obrigatória")
        @PositiveOrZero(message = "A posição deve ser maior ou igual a zero")
        Integer position,

        Instant createdAt,
        Instant dueDate,
        Boolean completed,

        List<@NotBlank(message = "A tag não pode ser vazia")
                @Size(max = 40, message = "A tag deve ter no máximo 40 caracteres") String> tags,

        UUID columnId
) {
}
