package br.udesc.kanban_backend.task;

import br.udesc.kanban_backend.shared.StatusResponse;
import br.udesc.kanban_backend.task.dto.CreateTaskRequest;
import br.udesc.kanban_backend.task.dto.TaskResponse;
import br.udesc.kanban_backend.task.dto.UpdateTaskRequest;
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
@RequestMapping("/api/v1/task")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @GetMapping("/from/{columnId}")
    public List<TaskResponse> listByColumn(@PathVariable UUID columnId) {
        // TODO 3: exponha a listagem das tarefas da coluna.
        throw new UnsupportedOperationException("TODO 3: listar tarefas");
    }

    @PostMapping("/from/{columnId}")
    public TaskResponse create(
            @PathVariable UUID columnId,
            @Valid @RequestBody CreateTaskRequest request
    ) {
        // TODO 3: valide o body e delegue a criação para o service.
        throw new UnsupportedOperationException("TODO 3: criar tarefa");
    }

    @PutMapping("/{taskId}")
    public TaskResponse update(
            @PathVariable UUID taskId,
            @Valid @RequestBody UpdateTaskRequest request
    ) {
        // TODO 3: valide o body e delegue a atualização para o service.
        throw new UnsupportedOperationException("TODO 3: atualizar tarefa");
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<StatusResponse> delete(@PathVariable UUID taskId) {
        // TODO extra: exponha a exclusão de uma tarefa.
        throw new UnsupportedOperationException("TODO extra: excluir tarefa");
    }
}
