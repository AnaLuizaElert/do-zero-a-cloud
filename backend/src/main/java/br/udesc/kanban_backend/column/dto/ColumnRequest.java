package br.udesc.kanban_backend.column.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record ColumnRequest(
        @NotBlank(message = "O nome é obrigatório")
        @Size(max = 120, message = "O nome deve ter no máximo 120 caracteres")
        String name,

        @NotNull(message = "A posição é obrigatória")
        @PositiveOrZero(message = "A posição deve ser maior ou igual a zero")
        Integer position,

        @NotNull(message = "O quadro é obrigatório")
        UUID boardId
) {
}
