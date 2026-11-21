package com.empresa.helpdesk.architecture;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import org.springframework.data.repository.Repository;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RestController;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * Reglas de arquitectura por capas (MVC + servicio + DAO/repositorio).
 *
 * <p>Se ejecutan en CI y fallan si alguien vuelve a saltarse una capa.</p>
 */
@AnalyzeClasses(packages = "com.empresa.helpdesk", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

    /** Los controladores no conocen la persistencia: solo hablan con servicios. */
    @ArchTest
    static final ArchRule controladores_no_acceden_a_repositorios =
            noClasses().that().resideInAPackage("..controller..")
                    .should().dependOnClassesThat().resideInAPackage("..repository..")
                    .because("la capa web debe delegar en servicios, no en DAO/repositorios");

    /** Los controladores no exponen entidades JPA: usan DTOs. */
    @ArchTest
    static final ArchRule controladores_no_dependen_de_entidades =
            noClasses().that().resideInAPackage("..controller..")
                    .should().dependOnClassesThat().resideInAPackage("..entity..")
                    .because("las entidades no deben filtrarse a la capa HTTP; usa DTOs");

    /** La capa de servicio no depende de la capa web. */
    @ArchTest
    static final ArchRule servicios_no_dependen_de_controladores =
            noClasses().that().resideInAPackage("..service..")
                    .should().dependOnClassesThat().resideInAPackage("..controller..")
                    .because("el flujo de dependencias es controller -> service -> repository");

    /** Los repositorios/DAO no conocen servicios ni controladores. */
    @ArchTest
    static final ArchRule repositorios_no_dependen_de_capas_superiores =
            noClasses().that().resideInAPackage("..repository..")
                    .should().dependOnClassesThat().resideInAnyPackage("..service..", "..controller..")
                    .because("la persistencia debe ser la capa más baja");

    /** La capa web debe ser REST y no usar JPA directamente. */
    @ArchTest
    static final ArchRule controladores_son_rest =
            classes().that().resideInAPackage("..controller..")
                    .should().beAnnotatedWith(RestController.class)
                    .because("la capa MVC expone endpoints REST a través de controladores");

    @ArchTest
    static final ArchRule controladores_no_usan_jpa =
            noClasses().that().resideInAPackage("..controller..")
                    .should().dependOnClassesThat()
                    .resideInAnyPackage("jakarta.persistence..", "org.hibernate..")
                    .because("JPA pertenece a la capa de persistencia, no a la capa HTTP");

    /** Los repositorios son interfaces DAO de Spring Data. */
    @ArchTest
    static final ArchRule repositorios_son_dao =
            classes().that().resideInAPackage("..repository..").and().areInterfaces()
                    .should().beAssignableTo(Repository.class)
                    .because("los repositorios deben ser DAO de Spring Data");

    /** Los servicios de dominio están registrados como beans de servicio. */
    @ArchTest
    static final ArchRule servicios_son_beans =
            classes().that().resideInAPackage("..service..").and().haveSimpleNameEndingWith("Service")
                    .should().beAnnotatedWith(Service.class)
                    .because("la lógica de negocio se expone mediante servicios Spring");
}
