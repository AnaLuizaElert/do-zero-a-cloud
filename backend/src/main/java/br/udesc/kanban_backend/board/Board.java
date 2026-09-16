package br.udesc.kanban_backend.board;

import jakarta.persistence.Column;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import br.udesc.kanban_backend.column.BoardColumn;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "boards")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Board {

    @Getter
    @Id
    private UUID id;

    @Getter
    @Column(nullable = false, length = 120)
    private String name;

    @OneToMany(mappedBy = "board", cascade = CascadeType.REMOVE)
    private List<BoardColumn> columns = new ArrayList<>();

    public Board(String name) {
        this.id = UUID.randomUUID();
        this.name = name;
    }

    public void rename(String name) {
        this.name = name;
    }
}
