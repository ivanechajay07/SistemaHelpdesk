# Build stage
FROM maven:3.9-eclipse-temurin-22-jammy AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -ntp dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage (usuario sin privilegios)
FROM eclipse-temurin:21-jre-jammy
RUN groupadd --system --gid 10001 app \
    && useradd --system --uid 10001 --gid app --home-dir /app --shell /usr/sbin/nologin app \
    && mkdir -p /app/uploads \
    && chown -R app:app /app
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
RUN chown app:app /app/app.jar
ENV APP_TZ=America/Lima
USER app
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Duser.timezone=${APP_TZ} -jar app.jar"]
