
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `actas_conformidad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `actas_conformidad` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `firma_solicitante` longtext NOT NULL,
  `firma_tecnico` longtext NOT NULL,
  `foto_data` longtext,
  `observaciones` text,
  `trabajos_realizados` text NOT NULL,
  `creado_por_id` bigint NOT NULL,
  `ticket_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK40k6jof7xcvxmouk4qfdu4igf` (`creado_por_id`),
  KEY `FKgmr68vse5mdh9rot8qr467vnf` (`ticket_id`),
  CONSTRAINT `FK40k6jof7xcvxmouk4qfdu4igf` FOREIGN KEY (`creado_por_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `FKgmr68vse5mdh9rot8qr467vnf` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `accion` varchar(60) NOT NULL,
  `detalle` varchar(400) DEFAULT NULL,
  `entidad` varchar(40) NOT NULL,
  `entidad_id` bigint DEFAULT NULL,
  `fecha` datetime(6) DEFAULT NULL,
  `usuario` varchar(50) NOT NULL,
  `dispositivo_modelo` varchar(120) DEFAULT NULL,
  `dispositivo_tipo` varchar(20) DEFAULT NULL,
  `ip` varchar(60) DEFAULT NULL,
  `navegador` varchar(60) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=126 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `active` bit(1) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_lm61k8w613aj8553pnrhe4qtn` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `correos_corporativos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `correos_corporativos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `apellidos` varchar(100) NOT NULL,
  `cargo` varchar(150) NOT NULL,
  `empresa` varchar(150) NOT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `correos_corporativos_cuentas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `correos_corporativos_cuentas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(200) NOT NULL,
  `password_encrypted` text NOT NULL,
  `correo_corporativo_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKdkbg91t3skld9wtaifabfcwvd` (`correo_corporativo_id`),
  CONSTRAINT `FKdkbg91t3skld9wtaifabfcwvd` FOREIGN KEY (`correo_corporativo_id`) REFERENCES `correos_corporativos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `entidades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entidades` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_6wvuug3lnsjv838wi1mc6cdk0` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inventario_activo_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventario_activo_tickets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `activo_id` bigint NOT NULL,
  `ticket_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKnmvgi3f0vt6pun782hjc37rsm` (`activo_id`),
  KEY `FK1jqey2alr34cmjqioqqa4gajt` (`ticket_id`),
  CONSTRAINT `FK1jqey2alr34cmjqioqqa4gajt` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`),
  CONSTRAINT `FKnmvgi3f0vt6pun782hjc37rsm` FOREIGN KEY (`activo_id`) REFERENCES `inventario_activos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inventario_activos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventario_activos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `area` varchar(150) DEFAULT NULL,
  `cargo_responsable` varchar(120) DEFAULT NULL,
  `codigo` varchar(60) NOT NULL,
  `codigo_patrimonial` varchar(120) DEFAULT NULL,
  `costo` decimal(14,2) DEFAULT NULL,
  `dni_responsable` varchar(60) DEFAULT NULL,
  `estado` enum('OPERATIVO','EN_MANTENIMIENTO','EN_REPARACION','PRESTADO','EN_TRANSITO','DISPONIBLE','RESERVADO','DADO_DE_BAJA','PERDIDO','ROBADO') NOT NULL,
  `fecha_actualizacion` datetime(6) DEFAULT NULL,
  `fecha_adquisicion` date DEFAULT NULL,
  `fecha_compra` date DEFAULT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `fecha_ingreso` date DEFAULT NULL,
  `foto_url` varchar(300) DEFAULT NULL,
  `garantia_inicio` date DEFAULT NULL,
  `garantia_vencimiento` date DEFAULT NULL,
  `marca` varchar(120) DEFAULT NULL,
  `modelo` varchar(120) DEFAULT NULL,
  `moneda` varchar(10) DEFAULT NULL,
  `nombre` varchar(150) NOT NULL,
  `numero_factura` varchar(100) DEFAULT NULL,
  `numero_serie` varchar(120) DEFAULT NULL,
  `orden_compra` varchar(100) DEFAULT NULL,
  `proveedor` varchar(150) DEFAULT NULL,
  `proveedor_garantia` varchar(150) DEFAULT NULL,
  `qr_token` varchar(80) DEFAULT NULL,
  `tiene_garantia` bit(1) NOT NULL,
  `ubicacion_fisica` varchar(200) DEFAULT NULL,
  `categoria_id` bigint NOT NULL,
  `entidad_id` bigint DEFAULT NULL,
  `responsable_id` bigint DEFAULT NULL,
  `sede_id` bigint DEFAULT NULL,
  `version` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_hqtkhs3gmibo4d1h4xlu86xvy` (`codigo`),
  UNIQUE KEY `UK_9093bijabdef79djn0bqptnko` (`qr_token`),
  KEY `FK2cryn7do4kwd1yb7795scrsce` (`categoria_id`),
  KEY `FK38agnq0xlfos0agv811gbajk8` (`entidad_id`),
  KEY `FKep1c00ssrrybhm06flouveybn` (`responsable_id`),
  KEY `FK1s6pp2opm6ep0mxdt2secqlnm` (`sede_id`),
  CONSTRAINT `FK1s6pp2opm6ep0mxdt2secqlnm` FOREIGN KEY (`sede_id`) REFERENCES `sedes` (`id`),
  CONSTRAINT `FK2cryn7do4kwd1yb7795scrsce` FOREIGN KEY (`categoria_id`) REFERENCES `inventario_categorias` (`id`),
  CONSTRAINT `FK38agnq0xlfos0agv811gbajk8` FOREIGN KEY (`entidad_id`) REFERENCES `entidades` (`id`),
  CONSTRAINT `FKep1c00ssrrybhm06flouveybn` FOREIGN KEY (`responsable_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inventario_categoria_campos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventario_categoria_campos` (
  `categoria_id` bigint NOT NULL,
  `campo` varchar(100) DEFAULT NULL,
  KEY `FK191i69gaf20yi7d66m2hkfnbd` (`categoria_id`),
  CONSTRAINT `FK191i69gaf20yi7d66m2hkfnbd` FOREIGN KEY (`categoria_id`) REFERENCES `inventario_categorias` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inventario_categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventario_categorias` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `activo` bit(1) NOT NULL,
  `descripcion` text,
  `nombre` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_1d9jk8pngr19nsesfi4ntj7cl` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inventario_documentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventario_documentos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `descripcion` text,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `nombre` varchar(200) NOT NULL,
  `tipo` varchar(100) NOT NULL,
  `url` varchar(300) NOT NULL,
  `activo_id` bigint NOT NULL,
  `subido_por_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK293ed7cv44yws2el6kkkq8i03` (`activo_id`),
  KEY `FK1pklxkukh3qyahcks5fdwup8q` (`subido_por_id`),
  CONSTRAINT `FK1pklxkukh3qyahcks5fdwup8q` FOREIGN KEY (`subido_por_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `FK293ed7cv44yws2el6kkkq8i03` FOREIGN KEY (`activo_id`) REFERENCES `inventario_activos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inventario_especificaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventario_especificaciones` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `clave` varchar(100) NOT NULL,
  `valor` varchar(300) DEFAULT NULL,
  `activo_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK3cxlf1o5bwgiuilgqo9diakrj` (`activo_id`),
  CONSTRAINT `FK3cxlf1o5bwgiuilgqo9diakrj` FOREIGN KEY (`activo_id`) REFERENCES `inventario_activos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inventario_mantenimientos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventario_mantenimientos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `costo` decimal(12,2) DEFAULT NULL,
  `descripcion` text,
  `documento_url` varchar(300) DEFAULT NULL,
  `estado` enum('PROGRAMADO','EN_PROCESO','FINALIZADO','CANCELADO') NOT NULL,
  `fecha` date NOT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `observaciones` text,
  `problema_encontrado` text,
  `proveedor` varchar(150) DEFAULT NULL,
  `proxima_revision` date DEFAULT NULL,
  `repuestos` text,
  `tipo` enum('PREVENTIVO','CORRECTIVO') NOT NULL,
  `trabajo_realizado` text,
  `activo_id` bigint NOT NULL,
  `tecnico_id` bigint DEFAULT NULL,
  `ticket_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK6ofky4rvoe3oyj0v1nu17s0g` (`activo_id`),
  KEY `FKk3c8flar4m1qa3hp8p8l4phjk` (`tecnico_id`),
  KEY `FKra65c5aq2qngnmifp1oie9yqv` (`ticket_id`),
  CONSTRAINT `FK6ofky4rvoe3oyj0v1nu17s0g` FOREIGN KEY (`activo_id`) REFERENCES `inventario_activos` (`id`),
  CONSTRAINT `FKk3c8flar4m1qa3hp8p8l4phjk` FOREIGN KEY (`tecnico_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `FKra65c5aq2qngnmifp1oie9yqv` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inventario_movimientos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventario_movimientos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `confirmado` bit(1) NOT NULL,
  `documento_url` varchar(300) DEFAULT NULL,
  `fecha` datetime(6) NOT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `observaciones` text,
  `tipo` enum('CAMBIO_SEDE','CAMBIO_ENTIDAD','CAMBIO_RESPONSABLE','CAMBIO_UBICACION','INGRESO','SALIDA','TRASLADO','DEVOLUCION','REEMPLAZO') NOT NULL,
  `ubicacion_destino` varchar(200) DEFAULT NULL,
  `ubicacion_origen` varchar(200) DEFAULT NULL,
  `activo_id` bigint NOT NULL,
  `entidad_destino_id` bigint DEFAULT NULL,
  `entidad_origen_id` bigint DEFAULT NULL,
  `responsable_anterior_id` bigint DEFAULT NULL,
  `responsable_nuevo_id` bigint DEFAULT NULL,
  `sede_destino_id` bigint DEFAULT NULL,
  `sede_origen_id` bigint DEFAULT NULL,
  `usuario_operacion_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK8t8cvaupcc7fqs4ybswbhwelu` (`activo_id`),
  KEY `FKrsih6qgypbsj8lem79wiaumc` (`entidad_destino_id`),
  KEY `FKvpmiknofiijxml8qmb4oimme` (`entidad_origen_id`),
  KEY `FK6snuj1tkrne5i3jefxccm003j` (`responsable_anterior_id`),
  KEY `FKiqkp54tq5aco4ts8ftjccwnhj` (`responsable_nuevo_id`),
  KEY `FKnop5jsex20ey40gkx8bhqanr9` (`sede_destino_id`),
  KEY `FK7j8mlgthk02hh9lhfinamvbs3` (`sede_origen_id`),
  KEY `FKhp4lse012xj2bqvbsbx9a5wet` (`usuario_operacion_id`),
  CONSTRAINT `FK6snuj1tkrne5i3jefxccm003j` FOREIGN KEY (`responsable_anterior_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `FK7j8mlgthk02hh9lhfinamvbs3` FOREIGN KEY (`sede_origen_id`) REFERENCES `sedes` (`id`),
  CONSTRAINT `FK8t8cvaupcc7fqs4ybswbhwelu` FOREIGN KEY (`activo_id`) REFERENCES `inventario_activos` (`id`),
  CONSTRAINT `FKhp4lse012xj2bqvbsbx9a5wet` FOREIGN KEY (`usuario_operacion_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `FKiqkp54tq5aco4ts8ftjccwnhj` FOREIGN KEY (`responsable_nuevo_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `FKnop5jsex20ey40gkx8bhqanr9` FOREIGN KEY (`sede_destino_id`) REFERENCES `sedes` (`id`),
  CONSTRAINT `FKrsih6qgypbsj8lem79wiaumc` FOREIGN KEY (`entidad_destino_id`) REFERENCES `entidades` (`id`),
  CONSTRAINT `FKvpmiknofiijxml8qmb4oimme` FOREIGN KEY (`entidad_origen_id`) REFERENCES `entidades` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inventario_prestamos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventario_prestamos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `estado` enum('SOLICITADO','APROBADO','ENTREGADO','DEVUELTO','VENCIDO','CANCELADO') NOT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `fecha_devolucion_prevista` date DEFAULT NULL,
  `fecha_devolucion_real` date DEFAULT NULL,
  `fecha_entrega` date DEFAULT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `observaciones` text,
  `activo_id` bigint NOT NULL,
  `responsable_entrega_id` bigint DEFAULT NULL,
  `solicitante_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKnra168nxch07aokfneswsh89h` (`activo_id`),
  KEY `FKsuuwvj9m6mn861onl76qotcmh` (`responsable_entrega_id`),
  KEY `FKrf2b774ydngd2jb00u8wdicrj` (`solicitante_id`),
  CONSTRAINT `FKnra168nxch07aokfneswsh89h` FOREIGN KEY (`activo_id`) REFERENCES `inventario_activos` (`id`),
  CONSTRAINT `FKrf2b774ydngd2jb00u8wdicrj` FOREIGN KEY (`solicitante_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `FKsuuwvj9m6mn861onl76qotcmh` FOREIGN KEY (`responsable_entrega_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inventario_transferencia_activos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventario_transferencia_activos` (
  `transferencia_id` bigint NOT NULL,
  `activo_id` bigint NOT NULL,
  PRIMARY KEY (`transferencia_id`,`activo_id`),
  KEY `FKgadryaw22qu5so9p2ulqt75eu` (`activo_id`),
  CONSTRAINT `FK6pfuawdocipk1m0v8p4xtulaa` FOREIGN KEY (`transferencia_id`) REFERENCES `inventario_transferencias` (`id`),
  CONSTRAINT `FKgadryaw22qu5so9p2ulqt75eu` FOREIGN KEY (`activo_id`) REFERENCES `inventario_activos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inventario_transferencias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventario_transferencias` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `estado` enum('BORRADOR','PENDIENTE_APROBACION','EN_TRANSITO','RECIBIDO','RECHAZADO','CANCELADO') NOT NULL,
  `fecha` datetime(6) NOT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `fecha_recepcion` datetime(6) DEFAULT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `numero_documento` varchar(40) NOT NULL,
  `observaciones` text,
  `pdf_url` varchar(300) DEFAULT NULL,
  `creado_por_id` bigint DEFAULT NULL,
  `entidad_destino_id` bigint DEFAULT NULL,
  `entidad_origen_id` bigint DEFAULT NULL,
  `responsable_entrega_id` bigint DEFAULT NULL,
  `responsable_recibe_id` bigint DEFAULT NULL,
  `sede_destino_id` bigint DEFAULT NULL,
  `sede_origen_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_axbqb68h3kssxfvbv97fiq91h` (`numero_documento`),
  KEY `FKilawna14vsdq7s5sn7ptc3tgg` (`creado_por_id`),
  KEY `FK7x19dmbu9q0911cblvkhdh4hy` (`entidad_destino_id`),
  KEY `FK2xpfq559my5rg528xxbbksb0e` (`entidad_origen_id`),
  KEY `FKi8q6pkwob4vl2qv1co1f0m0vy` (`responsable_entrega_id`),
  KEY `FKarkirnf9w2tppryme3kyq8osk` (`responsable_recibe_id`),
  KEY `FKcjdt9medtvlnj78p2fx4gw6sl` (`sede_destino_id`),
  KEY `FKl4cq2yfd38s13ffq4696ecqpx` (`sede_origen_id`),
  CONSTRAINT `FK2xpfq559my5rg528xxbbksb0e` FOREIGN KEY (`entidad_origen_id`) REFERENCES `entidades` (`id`),
  CONSTRAINT `FK7x19dmbu9q0911cblvkhdh4hy` FOREIGN KEY (`entidad_destino_id`) REFERENCES `entidades` (`id`),
  CONSTRAINT `FKarkirnf9w2tppryme3kyq8osk` FOREIGN KEY (`responsable_recibe_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `FKcjdt9medtvlnj78p2fx4gw6sl` FOREIGN KEY (`sede_destino_id`) REFERENCES `sedes` (`id`),
  CONSTRAINT `FKi8q6pkwob4vl2qv1co1f0m0vy` FOREIGN KEY (`responsable_entrega_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `FKilawna14vsdq7s5sn7ptc3tgg` FOREIGN KEY (`creado_por_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `FKl4cq2yfd38s13ffq4696ecqpx` FOREIGN KEY (`sede_origen_id`) REFERENCES `sedes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `knowledge_articles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `knowledge_articles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `categoria` varchar(100) DEFAULT NULL,
  `contenido` text NOT NULL,
  `fecha_actualizacion` datetime(6) DEFAULT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `publicado` bit(1) NOT NULL,
  `titulo` varchar(200) NOT NULL,
  `vistas` int NOT NULL,
  `autor_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK92frm56n77qst8atl5q5icouf` (`autor_id`),
  CONSTRAINT `FK92frm56n77qst8atl5q5icouf` FOREIGN KEY (`autor_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `monitored_targets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `monitored_targets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `activo` bit(1) NOT NULL,
  `fallos_consecutivos` int NOT NULL,
  `fecha_actualizacion` datetime(6) DEFAULT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `host` varchar(500) NOT NULL,
  `intervalo_segundos` int NOT NULL,
  `nombre` varchar(120) NOT NULL,
  `puerto` int DEFAULT NULL,
  `ticket_abierto_id` bigint DEFAULT NULL,
  `tipo` enum('HTTP','TCP') NOT NULL,
  `ultima_latencia_ms` bigint DEFAULT NULL,
  `ultimo_chequeo` datetime(6) DEFAULT NULL,
  `ultimo_estado` enum('PENDING','UP','DOWN') NOT NULL,
  `umbral_fallos` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `password_reset_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_requests` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `fecha_resolucion` datetime(6) DEFAULT NULL,
  `fecha_solicitud` datetime(6) DEFAULT NULL,
  `status` enum('PENDIENTE','COMPLETADO','EXPIRADO') NOT NULL,
  `token` varchar(255) NOT NULL,
  `usuario_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_qugwfsm7qo4qjrs6nnywdkubk` (`token`),
  KEY `FK_prr_usuario` (`usuario_id`),
  CONSTRAINT `FK_prr_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permisos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `description` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_hlsdg96u58qno7s86afegwhup` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `rol_permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rol_permisos` (
  `rol_id` bigint NOT NULL,
  `permiso_id` bigint NOT NULL,
  PRIMARY KEY (`rol_id`,`permiso_id`),
  KEY `FK9a92613h451aryhufw6j7m4yd` (`permiso_id`),
  CONSTRAINT `FK3brv6p1mw68brbj5gq8xtq8el` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `FK9a92613h451aryhufw6j7m4yd` FOREIGN KEY (`permiso_id`) REFERENCES `permisos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `description` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_ofx66keruapi6vyqpv6f2or37` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sedes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sedes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `descripcion` text,
  `nombre` varchar(255) NOT NULL,
  `entidad_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKj9j6q7bgforgmh76n5brf63io` (`entidad_id`),
  CONSTRAINT `FKj9j6q7bgforgmh76n5brf63io` FOREIGN KEY (`entidad_id`) REFERENCES `entidades` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `subcategorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subcategorias` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `active` bit(1) NOT NULL,
  `name` varchar(255) NOT NULL,
  `categoria_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKiucm5ipf0wvec50s8j67r33rk` (`categoria_id`),
  CONSTRAINT `FKiucm5ipf0wvec50s8j67r33rk` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `task_evidencias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_evidencias` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `comentario` text,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `imagen_data` longtext NOT NULL,
  `tipo` varchar(20) NOT NULL,
  `subido_por_id` bigint DEFAULT NULL,
  `task_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKpnxj8pxltwhu54r26wr14h9mq` (`subido_por_id`),
  KEY `FKab5bdfxyi0hucjmymfqgnhic9` (`task_id`),
  CONSTRAINT `FKab5bdfxyi0hucjmymfqgnhic9` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`),
  CONSTRAINT `FKpnxj8pxltwhu54r26wr14h9mq` FOREIGN KEY (`subido_por_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `descripcion` text,
  `estado` enum('PENDIENTE','EN_PROCESO','COMPLETADA') NOT NULL,
  `fecha_actualizacion` datetime(6) DEFAULT NULL,
  `fecha_completada` datetime(6) DEFAULT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `fecha_fin` date NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_inicio_proceso` datetime(6) DEFAULT NULL,
  `prioridad` enum('BAJA','MEDIA','ALTA','CRITICA') NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `creador_id` bigint DEFAULT NULL,
  `tecnico_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKtrfvc7g7gakt1vxl2tsdvtpbt` (`creador_id`),
  KEY `FK4dk0765ysaiueledf1nmx2eec` (`tecnico_id`),
  CONSTRAINT `FK4dk0765ysaiueledf1nmx2eec` FOREIGN KEY (`tecnico_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `FKtrfvc7g7gakt1vxl2tsdvtpbt` FOREIGN KEY (`creador_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ticket_archivos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_archivos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `fecha_subida` datetime(6) DEFAULT NULL,
  `nombre_guardado` varchar(255) NOT NULL,
  `nombre_original` varchar(255) NOT NULL,
  `tamano` bigint DEFAULT NULL,
  `tipo_archivo` varchar(255) DEFAULT NULL,
  `url_archivo` varchar(255) NOT NULL,
  `mensaje_id` bigint DEFAULT NULL,
  `ticket_id` bigint NOT NULL,
  `usuario_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_dao3aaitsl0ruiv36d9aaytnj` (`mensaje_id`),
  KEY `FK_archivos_usuario` (`usuario_id`),
  KEY `FK_archivos_ticket` (`ticket_id`),
  CONSTRAINT `FK_archivos_mensaje` FOREIGN KEY (`mensaje_id`) REFERENCES `ticket_mensajes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_archivos_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_archivos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ticket_historial`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_historial` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `accion` varchar(255) NOT NULL,
  `detalle` text,
  `fecha_registro` datetime(6) DEFAULT NULL,
  `ticket_id` bigint NOT NULL,
  `usuario_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_historial_usuario` (`usuario_id`),
  KEY `FK_historial_ticket` (`ticket_id`),
  CONSTRAINT `FK_historial_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_historial_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ticket_mensajes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_mensajes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `contenido` text NOT NULL,
  `fecha_envio` datetime(6) DEFAULT NULL,
  `fecha_lectura` datetime(6) DEFAULT NULL,
  `leido` bit(1) NOT NULL,
  `remitente_id` bigint NOT NULL,
  `ticket_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_mensajes_remitente` (`remitente_id`),
  KEY `FK_mensajes_ticket` (`ticket_id`),
  CONSTRAINT `FK_mensajes_remitente` FOREIGN KEY (`remitente_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_mensajes_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ticket_ratings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_ratings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `comentario` varchar(500) DEFAULT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `puntaje` int NOT NULL,
  `ticket_id` bigint NOT NULL,
  `usuario_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKqcud1kw2gsgjyr2mf7vnei2pp` (`ticket_id`),
  KEY `FK9g34ascpmlpueh3u0rrrjm9d1` (`usuario_id`),
  CONSTRAINT `FK9g34ascpmlpueh3u0rrrjm9d1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `FKg97siy6uf9mmflksj6l563dtf` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ticket_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_templates` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `descripcion` text NOT NULL,
  `fecha_actualizacion` datetime(6) DEFAULT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `prioridad` varchar(20) NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `subcategoria_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKq7mph8fothieeotfttwl5y1` (`subcategoria_id`),
  CONSTRAINT `FKq7mph8fothieeotfttwl5y1` FOREIGN KEY (`subcategoria_id`) REFERENCES `subcategorias` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tickets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `codigo` varchar(255) NOT NULL,
  `descripcion` text NOT NULL,
  `entidad` varchar(150) DEFAULT NULL,
  `estado` enum('NUEVO','ASIGNADO','EN_PROCESO','EN_REVISION','PENDIENTE_USUARIO','PENDIENTE_TECNICO','RESUELTO','CERRADO','CANCELADO') NOT NULL,
  `fecha_actualizacion` datetime(6) DEFAULT NULL,
  `fecha_asignacion` datetime(6) DEFAULT NULL,
  `fecha_cierre` datetime(6) DEFAULT NULL,
  `fecha_creacion` datetime(6) DEFAULT NULL,
  `fecha_estimada_resolucion` datetime(6) DEFAULT NULL,
  `fecha_resolucion` datetime(6) DEFAULT NULL,
  `prioridad` enum('BAJA','MEDIA','ALTA','CRITICA') NOT NULL,
  `reactivado` bit(1) NOT NULL,
  `sede` varchar(150) DEFAULT NULL,
  `titulo` varchar(255) NOT NULL,
  `solicitante_id` bigint NOT NULL,
  `subcategoria_id` bigint NOT NULL,
  `tecnico_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_dt8bqmsswrabpy42ik8ntb6bi` (`codigo`),
  KEY `FKkkg8jnbn2iv6mcfu3pr2byus5` (`subcategoria_id`),
  KEY `FK_tickets_solicitante` (`solicitante_id`),
  KEY `FK_tickets_tecnico` (`tecnico_id`),
  CONSTRAINT `FK_tickets_solicitante` FOREIGN KEY (`solicitante_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_tickets_tecnico` FOREIGN KEY (`tecnico_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FKkkg8jnbn2iv6mcfu3pr2byus5` FOREIGN KEY (`subcategoria_id`) REFERENCES `subcategorias` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `usuario_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuario_roles` (
  `usuario_id` bigint NOT NULL,
  `rol_id` bigint NOT NULL,
  PRIMARY KEY (`usuario_id`,`rol_id`),
  KEY `FKbt9i9yrb9ug88xnh82n9m60pr` (`rol_id`),
  CONSTRAINT `FK_usuario_roles_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FKbt9i9yrb9ug88xnh82n9m60pr` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `activo` bit(1) NOT NULL,
  `apellidos` varchar(255) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `last_activity` datetime(6) DEFAULT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `nombre` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `telefono` varchar(255) DEFAULT NULL,
  `username` varchar(255) NOT NULL,
  `dispositivo_modelo` varchar(120) DEFAULT NULL,
  `dispositivo_so` varchar(60) DEFAULT NULL,
  `dispositivo_tipo` varchar(20) DEFAULT NULL,
  `ip_ultima` varchar(60) DEFAULT NULL,
  `navegador` varchar(60) DEFAULT NULL,
  `failed_login_attempts` int DEFAULT NULL,
  `locked_until` datetime(6) DEFAULT NULL,
  `token_version` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_kfsp0s1tflm1cwlj8idhqsad0` (`email`),
  UNIQUE KEY `UK_m2dvbwfge291euvmk6vkkocao` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
