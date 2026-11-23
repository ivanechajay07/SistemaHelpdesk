# syntax=docker/dockerfile:1

# Build stage
FROM maven:3.9-eclipse-temurin-21-jammy AS build
ARG MAVEN_MIRROR_URL=https://repo.maven.apache.org/maven2
ENV MAVEN_MIRROR_URL=$MAVEN_MIRROR_URL
WORKDIR /app
COPY docker-settings.xml /root/.m2/settings.xml
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2/repository mvn -B -ntp dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2/repository mvn -B -ntp clean package -DskipTests

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
