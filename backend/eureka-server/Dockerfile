FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build

# Copy entire backend directory
COPY . .

# Build only this service
RUN mvn -f eureka-server/pom.xml clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /build/eureka-server/target/*.jar app.jar
EXPOSE 8761
ENTRYPOINT ["java", "-jar", "app.jar"]
