package br.udesc.kanban_backend.task;

import br.udesc.kanban_backend.column.BoardColumn;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "kanban_tasks")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class KanbanTask {

    @Getter
    @Id
    private UUID id;

    @Getter
    // TODO 3a: mapeie o nome como coluna obrigatória com no máximo 120 caracteres.
    private String name;

    @Getter
    // TODO 3a: mapeie a posição na coluna física position_index, obrigatória.
    private int position;

    @Getter
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Getter
    @Column(name = "due_date")
    private Instant dueDate;

    @Getter
    @Column(nullable = false)
    private boolean completed;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "task_tags", joinColumns = @JoinColumn(name = "task_id"))
    @OrderColumn(name = "tag_order")
    @Column(name = "tag", nullable = false, length = 40)
    private List<String> tags = new ArrayList<>();

    @Getter
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "column_id", nullable = false)
    private BoardColumn column;

    public KanbanTask(
            String name,
            int position,
            Instant createdAt,
            Instant dueDate,
            boolean completed,
            List<String> tags,
            BoardColumn column
    ) {
        // TODO 3: inicialize todos os campos e faça uma cópia defensiva das tags.
        throw new UnsupportedOperationException("TODO 3: construir tarefa");
    }

    public List<String> getTags() {
        return List.copyOf(tags);
    }

    public void update(
            String name,
            int position,
            Instant dueDate,
            boolean completed,
            List<String> tags,
            BoardColumn column
    ) {
        // TODO 3: atualize os campos permitidos sem alterar createdAt.
        throw new UnsupportedOperationException("TODO 3: atualizar tarefa");
    }
}
