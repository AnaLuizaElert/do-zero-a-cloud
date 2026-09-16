package br.udesc.kanban_backend.column;

import br.udesc.kanban_backend.board.Board;
import br.udesc.kanban_backend.task.KanbanTask;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "board_columns")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BoardColumn {

    @Getter
    @Id
    private UUID id;

    @Getter
    @Column(nullable = false, length = 120)
    private String name;

    @Getter
    @Column(name = "position_index", nullable = false)
    private int position;

    @Getter
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @OneToMany(mappedBy = "column", cascade = CascadeType.REMOVE)
    private List<KanbanTask> tasks = new ArrayList<>();

    public BoardColumn(String name, int position, Board board) {
        this.id = UUID.randomUUID();
        this.name = name;
        this.position = position;
        this.board = board;
    }

    public void update(String name, int position, Board board) {
        this.name = name;
        this.position = position;
        this.board = board;
    }
}
