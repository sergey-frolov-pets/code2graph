export const MERMAID_ER_MINIMAL = `erDiagram
  CUSTOMER ||--o{ ORDER : places`;

export const MERMAID_ER_MEDIUM = `erDiagram
  CUSTOMER {
    string name
  }
  ORDER {
    string id
  }
  PRODUCT {
    string sku
  }
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ PRODUCT : contains`;
