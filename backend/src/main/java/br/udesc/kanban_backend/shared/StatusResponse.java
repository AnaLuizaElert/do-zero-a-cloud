package br.udesc.kanban_backend.shared;

public record StatusResponse(String status) {

    public static StatusResponse ok() {
        return new StatusResponse("ok");
    }
}
