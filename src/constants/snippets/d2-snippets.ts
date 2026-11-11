import type { BuiltinSnippet } from "@/types/snippets";

export const D2_BUILTIN_SNIPPETS: BuiltinSnippet[] = [
  {
    id: "d2-direction-flow",
    language: "d2",
    categoryId: "flowchart",
    titleKey: "snippets.builtin.d2DirectionFlow",
    descriptionKey: "snippets.builtin.d2DirectionFlowDesc",
    content: `direction: right

client: "Client" {shape: person}
api: "API Gateway" {shape: hexagon}
db: "Database" {shape: cylinder}

client -> api: "HTTPS"
api -> db: "SQL"`,
  },
  {
    id: "d2-container-grid",
    language: "d2",
    categoryId: "architecture",
    titleKey: "snippets.builtin.d2ContainerGrid",
    descriptionKey: "snippets.builtin.d2ContainerGridDesc",
    content: `platform: "Platform" {
  grid-rows: 2
  grid-columns: 2
  grid-gap: 20

  web: "Web UI"
  api: "API"
  worker: "Worker"
  queue: "Queue" {shape: queue}
}`,
  },
  {
    id: "d2-sequence-diagram",
    language: "d2",
    categoryId: "sequence",
    titleKey: "snippets.builtin.d2SequenceDiagram",
    descriptionKey: "snippets.builtin.d2SequenceDiagramDesc",
    content: `checkout: "Checkout" {
  shape: sequence_diagram
  user: "Customer"
  api: "Order API"
  pay: "Payments"

  user -> api: "Create order"
  api -> pay: "Authorize"
  pay -> api: "OK"
  api -> user: "Confirmed"
}`,
  },
  {
    id: "d2-class-shape",
    language: "d2",
    categoryId: "classes",
    titleKey: "snippets.builtin.d2ClassShape",
    descriptionKey: "snippets.builtin.d2ClassShapeDesc",
    content: `User: {
  shape: class
  +id: int
  +email: string
  -passwordHash: string
  +verify(token: string): bool
}`,
  },
  {
    id: "d2-sql-table",
    language: "d2",
    categoryId: "er",
    titleKey: "snippets.builtin.d2SqlTable",
    descriptionKey: "snippets.builtin.d2SqlTableDesc",
    content: `users: {
  shape: sql_table
  id: int {constraint: primary_key}
  email: string {constraint: unique}
}

orders: {
  shape: sql_table
  id: int {constraint: primary_key}
  user_id: int {constraint: foreign_key}
}

users.id -> orders.user_id`,
  },
  {
    id: "d2-style-classes",
    language: "d2",
    categoryId: "styles",
    titleKey: "snippets.builtin.d2StyleClasses",
    descriptionKey: "snippets.builtin.d2StyleClassesDesc",
    content: `classes: {
  highlight: {
    style: {
      fill: "#dbeafe"
      stroke: "#1d4ed8"
      stroke-width: 2
      border-radius: 8
      shadow: true
    }
  }
}

service: "Core API" {
  class: highlight
}`,
  },
  {
    id: "d2-note-callout",
    language: "d2",
    categoryId: "notes",
    titleKey: "snippets.builtin.d2NoteCallout",
    descriptionKey: "snippets.builtin.d2NoteCalloutDesc",
    content: `note: "Rate limit: 100 req/s" {
  shape: callout
  near: api
}`,
  },
];
