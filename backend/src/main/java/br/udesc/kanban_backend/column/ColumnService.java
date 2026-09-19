package br.udesc.kanban_backend.column;

import br.udesc.kanban_backend.board.Board;
import br.udesc.kanban_backend.board.BoardService;
import br.udesc.kanban_backend.column.dto.ColumnRequest;
import br.udesc.kanban_backend.column.dto.ColumnResponse;
import br.udesc.kanban_backend.shared.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ColumnService {

    private final ColumnRepository columnRepository;
    private final BoardService boardService;

    @Transactional(readOnly = true)
    public List<ColumnResponse> listByBoard(UUID boardId) {
        List<BoardColumn> listBoard = columnRepository.findByBoard_IdOrderByPositionAsc(boardId);
        List<ColumnResponse> listColumn = new ArrayList<>();
        for(BoardColumn board : listBoard){
            listColumn.add(
                    new ColumnResponse(
                            board.getId(), board.getName(), board.getPosition(), board.getBoard().getId()
                    )
            );
        }
        return listColumn;
    }

    @Transactional
    public ColumnResponse create(ColumnRequest request) {
        Board board = findBoard(request.boardId());
        BoardColumn newColumn = columnRepository.save(
            new BoardColumn(
                    request.name().trim(), request.position(), board
            )
        );
        return new ColumnResponse(newColumn.getId(), newColumn.getName(), newColumn.getPosition(), newColumn.getBoard().getId());
    }

    @Transactional
    public ColumnResponse update(UUID columnId, ColumnRequest request) {
        BoardColumn column = findColumn(columnId);
        Board board = findBoard(request.boardId());
        column.update(request.name().trim(), request.position(), board);
        return toResponse(column);
    }

    @Transactional
    public void delete(UUID columnId) {
        BoardColumn column = findColumn(columnId);
        columnRepository.delete(column);
    }

    private Board findBoard(UUID boardId) {
        return boardService.findBoard(boardId);
    }

    @Transactional(readOnly = true)
    public BoardColumn findColumn(UUID columnId) {
        return columnRepository.findById(columnId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Coluna %s não encontrada".formatted(columnId)
                ));
    }

    private static ColumnResponse toResponse(BoardColumn column) {
        return new ColumnResponse(
                column.getId(),
                column.getName(),
                column.getPosition(),
                column.getBoard().getId()
        );
    }
}
