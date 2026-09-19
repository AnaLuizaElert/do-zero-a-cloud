package br.udesc.kanban_backend.board;

import br.udesc.kanban_backend.board.dto.BoardRequest;
import br.udesc.kanban_backend.board.dto.BoardResponse;
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
@RequestMapping("/api/v1/board")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;

    @GetMapping
    public List<BoardResponse> list() {
        return boardService.list();
    }

    @PostMapping
    public BoardResponse create(@Valid @RequestBody BoardRequest request) {
        return boardService.create(request);
    }

    @PutMapping("/{boardId}")
    public BoardResponse update(
            @PathVariable UUID boardId,
            @Valid @RequestBody BoardRequest request
    ) {
        return boardService.update(boardId, request);
    }

    @DeleteMapping("/{boardId}")
    public ResponseEntity<StatusResponse> delete(@PathVariable UUID boardId) {
        boardService.delete(boardId);
        return ResponseEntity.ok(StatusResponse.ok());
    }
}
