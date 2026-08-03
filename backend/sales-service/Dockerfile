FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY . .
RUN --mount=type=cache,target=/root/.m2,sharing=locked mvn -f pom.xml -pl sales-service -am clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/sales-service/target/*.jar app.jar
EXPOSE 8084
ENTRYPOINT ["java", "-jar", "app.jar"]
