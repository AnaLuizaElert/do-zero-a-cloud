package br.udesc.kanban_backend.task;

import br.udesc.kanban_backend.column.BoardColumn;
import br.udesc.kanban_backend.column.ColumnService;
import br.udesc.kanban_backend.shared.BadRequestException;
import br.udesc.kanban_backend.shared.ResourceNotFoundException;
import br.udesc.kanban_backend.task.dto.CreateTaskRequest;
import br.udesc.kanban_backend.task.dto.TaskResponse;
import br.udesc.kanban_backend.task.dto.UpdateTaskRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ColumnService columnService;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<TaskResponse> listByColumn(UUID columnId) {
        // TODO 3: confirme a coluna, consulte o repository e converta o resultado.
        throw new UnsupportedOperationException("TODO 3: listar tarefas da coluna");
    }

    @Transactional
    public TaskResponse create(UUID columnId, CreateTaskRequest request) {
        // TODO 3: valide URL e body, datas e tags; construa e persista a tarefa.
        throw new UnsupportedOperationException("TODO 3: criar tarefa");
    }

    @Transactional
    public TaskResponse update(UUID taskId, UpdateTaskRequest request) {
        // TODO 3: localize a tarefa, preserve createdAt, valide os dados e atualize.
        throw new UnsupportedOperationException("TODO 3: atualizar tarefa");
    }

    @Transactional
    public void delete(UUID taskId) {
        // TODO extra: localize a tarefa antes de excluí-la.
        throw new UnsupportedOperationException("TODO extra: excluir tarefa");
    }

    private List<String> normalizeTags(List<String> tags) {
        if (tags == null) {
            return List.of();
        }

        Set<String> uniqueTags = new LinkedHashSet<>();
        List<String> normalizedTags = new ArrayList<>();
        for (String tag : tags) {
            String normalized = tag.trim();
            if (!uniqueTags.add(normalized)) {
                throw new BadRequestException("Tags duplicadas não são permitidas: %s".formatted(normalized));
            }
            normalizedTags.add(normalized);
        }
        return normalizedTags;
    }

    private void validateDueDate(Instant createdAt, Instant dueDate) {
        if (dueDate != null && dueDate.isBefore(createdAt)) {
            throw new BadRequestException("dueDate não pode ser anterior a createdAt");
        }
    }

    private BoardColumn findColumn(UUID columnId) {
        return columnService.findColumn(columnId);
    }

    private KanbanTask findTask(UUID taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Tarefa %s não encontrada".formatted(taskId)
                ));
    }

    private static TaskResponse toResponse(KanbanTask task) {
        return new TaskResponse(
                task.getId(),
                task.getName(),
                task.getPosition(),
                task.getCreatedAt(),
                task.getDueDate(),
                task.isCompleted(),
                task.getTags(),
                task.getColumn().getId()
        );
    }
}
