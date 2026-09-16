package br.udesc.kanban_backend.board;

import br.udesc.kanban_backend.board.dto.BoardRequest;
import br.udesc.kanban_backend.board.dto.BoardResponse;
import br.udesc.kanban_backend.shared.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BoardService {

    private final BoardRepository boardRepository;

    @Transactional(readOnly = true)
    public List<BoardResponse> list() {
        return boardRepository.findAllByOrderByNameAsc().stream()
                .map(BoardService::toResponse)
                .toList();
    }

    @Transactional
    public BoardResponse create(BoardRequest request) {
        Board board = boardRepository.save(new Board(request.name().trim()));
        return toResponse(board);
    }

    @Transactional
    public BoardResponse update(UUID boardId, BoardRequest request) {
        Board board = findBoard(boardId);
        board.rename(request.name().trim());
        return toResponse(board);
    }

    @Transactional
    public void delete(UUID boardId) {
        Board board = findBoard(boardId);
        boardRepository.delete(board);
    }

    @Transactional(readOnly = true)
    public Board findBoard(UUID boardId) {
        return boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Quadro %s não encontrado".formatted(boardId)
                ));
    }

    private static BoardResponse toResponse(Board board) {
        return new BoardResponse(board.getId(), board.getName());
    }
}
