package br.udesc.kanban_backend.board.dto;

import java.util.UUID;

public record BoardResponse(UUID id, String name) {
}
