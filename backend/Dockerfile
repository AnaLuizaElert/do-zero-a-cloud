FROM eclipse-temurin:17-jdk AS build

WORKDIR /workspace

COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q dependency:go-offline

COPY src src
RUN ./mvnw -q package && cp target/kanban-backend-*.jar app.jar

FROM eclipse-temurin:17-jre

RUN useradd --system --uid 1001 spring
USER spring

COPY --from=build --chown=spring:spring /workspace/app.jar /app.jar

EXPOSE 8090
ENTRYPOINT ["java", "-jar", "/app.jar"]
