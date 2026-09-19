package br.udesc.kanban_backend.column;

import br.udesc.kanban_backend.column.dto.ColumnRequest;
import br.udesc.kanban_backend.column.dto.ColumnResponse;
import br.udesc.kanban_backend.shared.StatusResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/column")
@RequiredArgsConstructor
public class ColumnController {

    private final ColumnService columnService;

    @GetMapping("/from/{boardId}")
    public List<ColumnResponse> listByBoard(@PathVariable UUID boardId) {
        return columnService.listByBoard(boardId);
    }

    @PostMapping
    public ColumnResponse create(@Valid @RequestBody ColumnRequest request) {
        return columnService.create(request);
    }

    @PutMapping("/{columnId}")
    public ColumnResponse update(
            @PathVariable UUID columnId,
            @Valid @RequestBody ColumnRequest request
    ) {
        return columnService.update(columnId, request);
    }

    @DeleteMapping("/{columnId}")
    public ResponseEntity<StatusResponse> delete(@PathVariable UUID columnId) {
        columnService.delete(columnId);
        return ResponseEntity.ok(StatusResponse.ok());
    }
}
