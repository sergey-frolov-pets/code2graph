export const PLANTUML_CLASS_MINIMAL = `@startuml
class Animal
class Dog
Animal <|-- Dog
@enduml`;

export const MERMAID_CLASS_MINIMAL = `classDiagram
  class Animal
  class Dog
  Animal <|-- Dog`;

export const PLANTUML_CLASS_MEDIUM = `@startuml
interface Pet
class Animal
class Dog
Pet <|.. Animal
Animal <|-- Dog
@enduml`;

export const MERMAID_CLASS_MEDIUM = `classDiagram
  class Pet
  class Animal
  class Dog
  Pet <|.. Animal
  Animal <|-- Dog`;
