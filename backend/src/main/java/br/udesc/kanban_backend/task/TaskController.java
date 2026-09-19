package br.udesc.kanban_backend.task;

import br.udesc.kanban_backend.shared.StatusResponse;
import br.udesc.kanban_backend.task.dto.CreateTaskRequest;
import br.udesc.kanban_backend.task.dto.TaskResponse;
import br.udesc.kanban_backend.task.dto.UpdateTaskRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/task")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @GetMapping("/from/{columnId}")
    public List<TaskResponse> listByColumn(@PathVariable UUID columnId) {
        return taskService.listByColumn(columnId);
    }

    @PostMapping("/from/{columnId}")
    public TaskResponse create(
            @PathVariable UUID columnId,
            @Valid @RequestBody CreateTaskRequest request
    ) {
        return taskService.create(columnId, request);
    }

    @PutMapping("/{taskId}")
    public TaskResponse update(
            @PathVariable UUID taskId,
            @Valid @RequestBody UpdateTaskRequest request
    ) {
        return taskService.update(taskId, request);
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<StatusResponse> delete(@PathVariable UUID taskId) {
        try{
            taskService.delete(taskId);
            return ResponseEntity.ok(StatusResponse.ok());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
    }
}
