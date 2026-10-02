# Build stage
FROM maven:3.9.6-eclipse-temurin-21-jammy AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline || true
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENV APP_TZ=America/Lima
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Duser.timezone=${APP_TZ} -jar app.jar"]
