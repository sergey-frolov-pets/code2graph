import type { BuiltinSnippet } from "@/types/snippets";

export const BUILTIN_SNIPPETS: BuiltinSnippet[] = [
  // basic
  {
    id: "basic-start-end",
    categoryId: "basic",
    titleKey: "snippets.builtin.basicStartEnd",
    descriptionKey: "snippets.builtin.basicStartEndDesc",
    content: `@startuml
!pragma layout smetana

@enduml`,
  },
  {
    id: "basic-title",
    categoryId: "basic",
    titleKey: "snippets.builtin.basicTitle",
    descriptionKey: "snippets.builtin.basicTitleDesc",
    content: "title Диаграмма",
  },
  {
    id: "basic-layout-pragma",
    categoryId: "basic",
    titleKey: "snippets.builtin.basicLayoutPragma",
    descriptionKey: "snippets.builtin.basicLayoutPragmaDesc",
    content: "!pragma layout smetana",
  },

  // classes
  {
    id: "class-definition",
    categoryId: "classes",
    titleKey: "snippets.builtin.classDefinition",
    descriptionKey: "snippets.builtin.classDefinitionDesc",
    content: `class User {
  +id: int
  +name: string
  +login()
}`,
  },
  {
    id: "class-interface",
    categoryId: "classes",
    titleKey: "snippets.builtin.classInterface",
    descriptionKey: "snippets.builtin.classInterfaceDesc",
    content: `interface Repository {
  +find(id: int)
  +save(entity)
}`,
  },
  {
    id: "class-enum",
    categoryId: "classes",
    titleKey: "snippets.builtin.classEnum",
    descriptionKey: "snippets.builtin.classEnumDesc",
    content: `enum Status {
  PENDING
  ACTIVE
  CLOSED
}`,
  },
  {
    id: "class-inheritance",
    categoryId: "classes",
    titleKey: "snippets.builtin.classInheritance",
    descriptionKey: "snippets.builtin.classInheritanceDesc",
    content: "Animal <|-- Dog",
  },
  {
    id: "class-association",
    categoryId: "classes",
    titleKey: "snippets.builtin.classAssociation",
    descriptionKey: "snippets.builtin.classAssociationDesc",
    content: 'User "1" --> "*" Order : создаёт',
  },
  {
    id: "class-dependency",
    categoryId: "classes",
    titleKey: "snippets.builtin.classDependency",
    descriptionKey: "snippets.builtin.classDependencyDesc",
    content: "Controller ..> Service",
  },

  // sequence
  {
    id: "sequence-actors",
    categoryId: "sequence",
    titleKey: "snippets.builtin.sequenceActors",
    descriptionKey: "snippets.builtin.sequenceActorsDesc",
    content: `actor User
participant App
database DB`,
  },
  {
    id: "sequence-message",
    categoryId: "sequence",
    titleKey: "snippets.builtin.sequenceMessage",
    descriptionKey: "snippets.builtin.sequenceMessageDesc",
    content: "User -> App : запрос\nApp --> User : ответ",
  },
  {
    id: "sequence-self-call",
    categoryId: "sequence",
    titleKey: "snippets.builtin.sequenceSelfCall",
    descriptionKey: "snippets.builtin.sequenceSelfCallDesc",
    content: "App -> App : validate()",
  },
  {
    id: "sequence-create",
    categoryId: "sequence",
    titleKey: "snippets.builtin.sequenceCreate",
    descriptionKey: "snippets.builtin.sequenceCreateDesc",
    content: "create participant Worker",
  },
  {
    id: "sequence-destroy",
    categoryId: "sequence",
    titleKey: "snippets.builtin.sequenceDestroy",
    descriptionKey: "snippets.builtin.sequenceDestroyDesc",
    content: "destroy Worker",
  },

  // state
  {
    id: "state-basic",
    categoryId: "state",
    titleKey: "snippets.builtin.stateBasic",
    descriptionKey: "snippets.builtin.stateBasicDesc",
    content: `[*] --> Idle\nIdle --> Active : start()\nActive --> [*]`,
  },
  {
    id: "state-transition",
    categoryId: "state",
    titleKey: "snippets.builtin.stateTransition",
    descriptionKey: "snippets.builtin.stateTransitionDesc",
    content: "Idle --> Rendering : render()\nRendering --> Done : success",
  },
  {
    id: "state-nested",
    categoryId: "state",
    titleKey: "snippets.builtin.stateNested",
    descriptionKey: "snippets.builtin.stateNestedDesc",
    content: `state Processing {
  [*] --> Validating
  Validating --> Executing
  Executing --> [*]
}`,
  },

  // activity
  {
    id: "activity-start-stop",
    categoryId: "activity",
    titleKey: "snippets.builtin.activityStartStop",
    descriptionKey: "snippets.builtin.activityStartStopDesc",
    content: "start\n:Действие;\nstop",
  },
  {
    id: "activity-if-else",
    categoryId: "activity",
    titleKey: "snippets.builtin.activityIfElse",
    descriptionKey: "snippets.builtin.activityIfElseDesc",
    content: `if (условие?) then (да)
  :Действие A;
else (нет)
  :Действие B;
endif`,
  },
  {
    id: "activity-while",
    categoryId: "activity",
    titleKey: "snippets.builtin.activityWhile",
    descriptionKey: "snippets.builtin.activityWhileDesc",
    content: `while (есть данные?) is (да)
  :Обработать;
endwhile (нет)`,
  },
  {
    id: "activity-swimlane",
    categoryId: "activity",
    titleKey: "snippets.builtin.activitySwimlane",
    descriptionKey: "snippets.builtin.activitySwimlaneDesc",
    content: `|#E3F2FD|Клиент|
start
:Отправить запрос;
|#E8F5E9|Система|
:Обработать;
stop`,
  },
  {
    id: "activity-fork",
    categoryId: "activity",
    titleKey: "snippets.builtin.activityFork",
    descriptionKey: "snippets.builtin.activityForkDesc",
    content: `fork
  :Параллельно A;
fork again
  :Параллельно B;
end fork`,
  },

  // components
  {
    id: "component-package",
    categoryId: "components",
    titleKey: "snippets.builtin.componentPackage",
    descriptionKey: "snippets.builtin.componentPackageDesc",
    content: `package "Frontend" {
  [Vue App]
}`,
  },
  {
    id: "component-node",
    categoryId: "components",
    titleKey: "snippets.builtin.componentNode",
    descriptionKey: "snippets.builtin.componentNodeDesc",
    content: `node "Server" {
  [API]
  database "DB"
}`,
  },
  {
    id: "component-link",
    categoryId: "components",
    titleKey: "snippets.builtin.componentLink",
    descriptionKey: "snippets.builtin.componentLinkDesc",
    content: "[Client] --> [Server] : HTTP",
  },
  {
    id: "component-cloud",
    categoryId: "components",
    titleKey: "snippets.builtin.componentCloud",
    descriptionKey: "snippets.builtin.componentCloudDesc",
    content: "cloud CDN\n[App] ..> CDN : static",
  },

  // styles
  {
    id: "style-skinparam",
    categoryId: "styles",
    titleKey: "snippets.builtin.styleSkinparam",
    descriptionKey: "snippets.builtin.styleSkinparamDesc",
    content: `skinparam classAttributeIconSize 0
skinparam shadowing false
skinparam roundcorner 8`,
  },
  {
    id: "style-colors",
    categoryId: "styles",
    titleKey: "snippets.builtin.styleColors",
    descriptionKey: "snippets.builtin.styleColorsDesc",
    content: `skinparam backgroundColor #F8FAFC
skinparam class {
  BackgroundColor #E3F2FD
  BorderColor #1976D2
}`,
  },
  {
    id: "style-stereotype",
    categoryId: "styles",
    titleKey: "snippets.builtin.styleStereotype",
    descriptionKey: "snippets.builtin.styleStereotypeDesc",
    content: `class Service << (S,#FF7700) Service >>`,
  },
  {
    id: "style-hide",
    categoryId: "styles",
    titleKey: "snippets.builtin.styleHide",
    descriptionKey: "snippets.builtin.styleHideDesc",
    content: "hide empty members\nhide circle",
  },
  {
    id: "style-arrow-color",
    categoryId: "styles",
    titleKey: "snippets.builtin.styleArrowColor",
    descriptionKey: "snippets.builtin.styleArrowColorDesc",
    content: "A -[#red]-> B : ошибка",
  },

  // notes
  {
    id: "note-right",
    categoryId: "notes",
    titleKey: "snippets.builtin.noteRight",
    descriptionKey: "snippets.builtin.noteRightDesc",
    content: `note right of User
  Пояснение
end note`,
  },
  {
    id: "note-left",
    categoryId: "notes",
    titleKey: "snippets.builtin.noteLeft",
    descriptionKey: "snippets.builtin.noteLeftDesc",
    content: `note left of User
  Пояснение
end note`,
  },
  {
    id: "note-top",
    categoryId: "notes",
    titleKey: "snippets.builtin.noteTop",
    descriptionKey: "snippets.builtin.noteTopDesc",
    content: `note top of User
  Заголовок
end note`,
  },
  {
    id: "note-floating",
    categoryId: "notes",
    titleKey: "snippets.builtin.noteFloating",
    descriptionKey: "snippets.builtin.noteFloatingDesc",
    content: `note as N1
  Плавающая заметка
end note`,
  },
  {
    id: "note-on-link",
    categoryId: "notes",
    titleKey: "snippets.builtin.noteOnLink",
    descriptionKey: "snippets.builtin.noteOnLinkDesc",
    content: `note on link
  Комментарий к связи
end note`,
  },

  // conditional (sequence alt/opt/loop/par + group)
  {
    id: "conditional-alt",
    categoryId: "conditional",
    titleKey: "snippets.builtin.conditionalAlt",
    descriptionKey: "snippets.builtin.conditionalAltDesc",
    content: `alt успех
  App --> User : OK
else ошибка
  App --> User : Error
end`,
  },
  {
    id: "conditional-opt",
    categoryId: "conditional",
    titleKey: "snippets.builtin.conditionalOpt",
    descriptionKey: "snippets.builtin.conditionalOptDesc",
    content: `opt опционально
  App -> DB : cache lookup
end`,
  },
  {
    id: "conditional-loop",
    categoryId: "conditional",
    titleKey: "snippets.builtin.conditionalLoop",
    descriptionKey: "snippets.builtin.conditionalLoopDesc",
    content: `loop для каждого элемента
  App -> DB : fetch
end`,
  },
  {
    id: "conditional-par",
    categoryId: "conditional",
    titleKey: "snippets.builtin.conditionalPar",
    descriptionKey: "snippets.builtin.conditionalParDesc",
    content: `par параллельно
  App -> ServiceA : call A
and
  App -> ServiceB : call B
end`,
  },
  {
    id: "conditional-group",
    categoryId: "conditional",
    titleKey: "snippets.builtin.conditionalGroup",
    descriptionKey: "snippets.builtin.conditionalGroupDesc",
    content: `group Аутентификация
  User -> App : credentials
  App -> DB : verify
end`,
  },
  {
    id: "conditional-break",
    categoryId: "conditional",
    titleKey: "snippets.builtin.conditionalBreak",
    descriptionKey: "snippets.builtin.conditionalBreakDesc",
    content: `break при ошибке
  App --> User : fail
end`,
  },
];

export function findBuiltinSnippet(id: string): BuiltinSnippet | undefined {
  return BUILTIN_SNIPPETS.find((snippet) => snippet.id === id);
}
