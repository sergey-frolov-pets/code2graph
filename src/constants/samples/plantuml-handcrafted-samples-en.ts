import type { HandcraftedPlantUmlSampleId } from "@/constants/plantuml-sample-diagrams";

export const SAMPLE_DIAGRAMS_EN: Record<HandcraftedPlantUmlSampleId, string> = {
  classes: `@startuml
' Full class diagram example: packages, inheritance, stereotypes
!pragma layout smetana

title Class diagram — full example

' Background and border colors for <<interface>> and <<enum>> stereotypes
skinparam class {
  BackgroundColor<<interface>> #E8F5E9
  BorderColor<<interface>> #2E7D32
  BackgroundColor<<enum>> #FFF3E0
  BorderColor<<enum>> #E65100
}

package "Domain" {
  ' Abstract class — cannot be instantiated directly
  abstract class Animal {
    +name: String
    +{abstract} move()
  }

  interface Feedable {
    +feed(food: String)
  }

  enum Diet {
    HERBIVORE
    CARNIVORE
    OMNIVORE
  }

  ' extends — inheritance; implements — interface realization
  class Dog extends Animal implements Feedable {
    -breed: String
    +bark()
    +feed(food: String)
  }

  class Cat extends Animal {
    +purr()
  }
}

' Package with <<Rectangle>> stereotype and background color
package "Services" <<Rectangle>> #E3F2FD {
  ' <<singleton>> — singleton pattern; (S,#FF7700) — icon
  class Veterinary << (S,#FF7700) singleton >> {
    +check(animal: Animal): Boolean
  }
}

' Notes attach to elements: top / right / left / bottom
note top of Animal : Base class\\nfor all animals
note right of Dog : Loyal\\ncompanion

' Composition (*--), dependency (..>), association (-->)
Dog "1" *-- "0..*" Cat : friends with
Veterinary ..> Animal : checks
Dog ..> Diet : follows
@enduml`,
  sequence: `@startuml
' Sequence diagram: interactions over time
!pragma layout smetana

title Sequence diagram — full example

skinparam sequence {
  ArrowColor #2E7D32
  LifeLineBorderColor #1565C0
}

' Participants: actor, participant, database; alias — short name
actor Client as client
participant "Web App" as app #LightBlue
participant Auth as auth #LightYellow
database DB as db

' == Phase separator (groups messages) ==
== Authentication ==

client -> app : POST /login
activate app
app -> auth : validate(credentials)
activate auth
auth -> db : SELECT user
activate db
db --> auth : user row
deactivate db
auth --> app : token
deactivate auth

' alt — conditional branch (if/else)
alt Success
  app --> client : 200 OK + JWT
else Invalid credentials
  app --> client : 401 Unauthorized
end

deactivate app

== Data loading ==

client -> app : GET /dashboard
activate app

' opt — optional fragment (executed when condition holds)
opt Cache empty
  app -> db : SELECT data
  db --> app : rows
end

' loop — repeat for each item
loop each item
  app -> app : transform(item)
end

' par — parallel message flows
par Parallel fetch
  app -> db : metrics
  app -> auth : refresh token
end

app --> client : 200 OK
deactivate app
@enduml`,
  components: `@startuml
' Component diagram: modules, interfaces, and dependencies
!pragma layout smetana

title Component diagram — full example

skinparam componentStyle rectangle
skinparam packageStyle rectangle

package "Client" #E3F2FD {
  ' [Name] — component. <<interface>> is a contract; the label stays inside the package
  [Vue SPA] as spa
  [Service Worker] as sw
  component "HTTP API" <<interface>> as httpApi
}

package "Renderer" #E8F5E9 {
  ' frame — nested frame inside a package
  frame "PlantUML Engine" {
    [@plantuml/core] as core
    [Smetana Layout] as layout
  }
  core --> layout
}

package "Storage" #FFF3E0 {
  database "localStorage" as ls
  folder "public/vendor" {
    [plantuml.js]
    [viz-global.js]
  }
}

' Solid arrow — dependency; dotted (..>) — weak link
spa --> httpApi : fetch
spa ..> sw : offline
[plantuml.js] --> core : bootstrap
spa --> ls : persist

note right of core
  SVG rendering
  in browser
end note
@enduml`,
  state: `@startuml
' State diagram: lifecycle and conditional transitions
!pragma layout smetana

title State diagram — conditional transitions

skinparam state {
  BackgroundColor #E3F2FD
  BorderColor #1565C0
  FontColor #1A237E
}

' [*] — initial/final pseudostate
[*] --> Idle

' Nested state with entry action and description
state Idle {
  Idle : entry / resetTimer()
  Idle : Waiting for input
}

Idle --> Validating : submit()

' Composite state with internal logic
state Validating {
  state "Check" as check
  ' choice — branch node with guard conditions [valid]/[invalid]
  state c <<choice>>
  [*] --> check
  check --> c
  c --> Passed : [valid]
  c --> Failed : [invalid]
  Passed --> [*]
  Failed --> [*]
}

Validating --> Rendering : success
Validating --> Idle : cancel()

state Rendering {
  Rendering : Render SVG
}

Rendering --> Done : success
Rendering --> Error : failure

state Done {
  Done : entry / showPreview()
}

state Error {
  Error : entry / logError()
}

Done --> Idle : new diagram
Error --> Idle : retry

note right of Validating
  Conditional transition
  via choice node
end note
@enduml`,
  activity: `@startuml
' Activity diagram: workflow, swimlanes, and conditions
!pragma layout smetana

title Activity diagram — styles and conditions

skinparam activity {
  BackgroundColor #E8F5E9
  BorderColor #2E7D32
  DiamondBackgroundColor #FFF3E0
}

' Swimlanes — |color|Name| defines responsibility zones
|#E3F2FD|Client|
|#E8F5E9|Editor|
|#FFF3E0|Renderer|

start

|Client|
:Enter PlantUML code;

|Editor|
:Apply layout pragma;
' if/then/else — branching; <<#color>> after ';' — action highlight
if (Syntax valid?) then (yes)
  :Prepare source;
else (no)
  :Show error; <<#Pink>>
  stop
endif

|Renderer|
' fork/fork again/end fork — parallel branches
fork
  :Smetana layout;
fork again
  :Generate SVG;
end fork

|Client|
:Show preview;
:Export PNG/SVG; <<#LightBlue>>

stop
@enduml`,
  c4: `@startuml
' C4 model: system architecture at container level
!pragma layout smetana

' Include C4 library (files in public/plantuml-lib/C4/)
!include ./plantuml-lib/C4/C4_Container.puml

' Configure person outline and element/relationship tags
SHOW_PERSON_OUTLINE()
AddElementTag("backend", $fontColor=$ELEMENT_FONT_COLOR, $bgColor="#335DA5", $shape=EightSidedShape(), $legendText="backend\\n(eight sided)")
AddRelTag("async", $textColor=$ARROW_FONT_COLOR, $lineColor=$ARROW_COLOR, $lineStyle=DashedLine())

title C4 — Code2Graph (containers)

' Person — user; Person_Ext — external actor
Person(user, "User", "Creates and edits diagrams")
Person_Ext(admin, "Administrator", "Manages diagram library")

' System_Boundary — boundary of our system
System_Boundary(app, "Code2Graph") {
  Container(spa, "SPA", "Vue 3, TypeScript", "Diagram editor and preview")
  Container(api, "Library API", "Node.js, Hono", "REST API for diagram library", $tags="backend")
  ContainerDb(db, "SQLite", "SQLite 3", "Stores diagrams and metadata")
  ContainerQueue(sw, "Service Worker", "PWA", "Caching and offline support")
}

' System_Ext — external systems
System_Ext(plantuml, "PlantUML Core", "@plantuml/core in browser")
System_Ext(cdn, "CDN", "Static assets")

' Rel — link; Rel_Back — reverse direction; $tags — relationship style
Rel(user, spa, "Edits", "HTTPS")
Rel(spa, plantuml, "Renders", "in-process")
Rel(spa, api, "Loads library", "async/JSON", $tags="async")
Rel(api, db, "CRUD", "sync")
Rel_Back(spa, sw, "Caches", "events")
Rel(spa, cdn, "Static assets", "HTTPS")

SHOW_LEGEND()
@enduml`,
  gantt: `@startgantt
' Gantt chart: calendar, tasks, dependencies, colors, milestones, and resources
' project starts YYYY-MM-DD — project start; the first task without its own date begins here
' language ru|en|de|ja|zh|ko — calendar label language
' saturday are closed / sunday are closed — weekends are non-working days
' YYYY-MM-DD is closed — close one day; YYYY-MM-DD to YYYY-MM-DD are closed — close a range
' YYYY-MM-DD is open — reopen a closed day
' printscale|ganttscale|projectscale daily|weekly|monthly|quarterly|yearly — time axis scale:
'   daily     — day numbers (1, 2, 3...) and weekday letters (in the chosen language)
'   weekly    — by weeks (week numbers and month)
'   monthly   — by months (month names in the chosen language)
'   quarterly — by quarters (Q1, Q2, Q3, Q4 and year)
'   yearly    — by years
' printscale weekly zoom 2 — combine scale with zoom factor (0.5..4)
' zoom 1.5 — display zoom; today is colored in Coral — highlight today
' [Name] lasts N days|weeks|months — calendar duration
' [Name] requires N days — workload: closed days do not shorten a week
' [Name] starts YYYY-MM-DD / ends YYYY-MM-DD — absolute start and end dates
' [Name] starts D+N — start N days after the project start
' [Name] starts at [Other]'s end|start — depend on another task's end or start
' [Name] starts N days after|before [Other]'s end — dependency with a delay
' [Name] ends at [Other]'s end|start — tie this task's end to another task
' then [Name] lasts N days — the next task follows the previous one immediately
' [A] -> [B] — dependency arrow; -[dotted]-> and -[#RRGGBB]-> — link style
' [Full name] as [ID] — short alias used in references
' and is colored in Color or StartColor/EndColor — task bar color
' is N% completed|complete — completion percent; is deleted — discarded task
' [Milestone] happens YYYY-MM-DD — milestone on a date; happens at [Task]'s end — milestone at a task end
' displays on same row as [Name] — draw on the same row
' pauses N days / pauses on YYYY-MM-DD — pause inside a task
' on {Resource} and on {Resource:50%} — assign a resource and its load
' hide resources names / hide resources footbox / hide footbox — hide resource labels and the bottom scale
' -- Phase -- — horizontal separator between task groups
' Separator just at [Name]'s end — vertical separator on a task date
' note bottom ... end note — note under a task
' Label on first column and left aligned — labels in the first column (also last column, right aligned)
' [[https://example.com]] next to a name — hyperlink on a task

' Project start and closed weekends
project starts 2026-01-06
saturday are closed
sunday are closed

' Five-day task with a bar color
[Requirements analysis] lasts 5 days and is colored in LightGreen
' Start when the previous task ends
[UI prototype] lasts 4 days and starts at [Requirements analysis]'s end
[Development] lasts 10 days and starts at [UI prototype]'s end
[Testing] lasts 5 days and starts at [Development]'s end
' Milestone on a fixed date, with its own color
[Release] happens at 2026-02-20 and is colored in Coral
@endgantt`,
  mindmap: `@startmindmap
' Mind map — full PlantUML feature showcase (offline engine)
top to bottom direction

title Code2Graph — mind map
header Diagram editor
footer Offline · SVG · PNG
caption Fig. 1 — syntax demonstration
legend right
  * — OrgMode
  +/-- — arithmetic
  _ — boxless
endlegend

' Root node with inline color
*[#1565C0] Code2Graph

' Right branch (+) — arithmetic notation
+[#2E7D32] Editor
++ Monaco
+++_ Syntax highlighting
+++_ Autocomplete
+++_ Code folding
**:Multiline node
Editor and preview
in one window;
++ Themes

' Left branch (--) — arithmetic notation
--[#E65100] Formats
--- PlantUML
---- startuml
---- startgantt
---- startmindmap
--- Mermaid
---- flowchart
---- sequenceDiagram
---- mindmap
--- GraphML

left side

' Switch to left side (left side keyword)
--[#6A1B9A] Render
--- plantuml/core
--- Smetana layout
**:Preview
SVG in browser
without a server;

' OrgMode syntax (*) with inline colors
*[#C62828] Export
** SVG
** PNG
**_:Library
Save to IndexedDB
and sync;

' Multiline node with Creole markup
**:==Features
**bold** and //italic//
Monospace: ""code""
separator
• list
• items
;

' Second root — multiroot mindmap
*[#455A64] PWA
** Service Worker
** Offline mode
** Install on device
@endmindmap`,
};
