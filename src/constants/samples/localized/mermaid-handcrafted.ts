import type { AppLocale } from "@/constants/i18n";
import type { HandcraftedMermaidSampleId } from "@/constants/mermaid-sample-diagrams";

export const MERMAID_HANDCRAFTED_EXTRA: Record<
  Exclude<AppLocale, "ru" | "en">,
  Record<HandcraftedMermaidSampleId, string>
> = {
  es: {
    flowchart: `flowchart TD
    %% Diagrama de flujo: condiciones, subgrafos y estilos
    A([Inicio]) --> B{¿Válido?}
    B -->|sí| C[Procesar]
    B -->|no| D[Fallo]
    C --> E{¿Exportar?}
    E -->|SVG| F[Descargar SVG]
    E -->|PNG| G[Descargar PNG]
    F --> H([Listo])
    G --> H
    D --> H

    subgraph Edición
      C
      E
    end

    classDef ok fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef warn fill:#FFF3E0,stroke:#E65100,color:#BF360C
    class C,F,G ok
    class D warn
    linkStyle 0 stroke:#1565C0,stroke-width:2px
    click A "https://example.com" "Abrir"`,
    sequence: `sequenceDiagram
    %% Diagrama de secuencia: participantes, alt/opt/loop
    autonumber
    actor User as Usuario
    participant App as "Web App"
    participant API as "Library API"
    participant DB as "SQLite"

    User->>App: Abrir diagrama
    activate App
    App->>API: GET /diagrams/:id
    activate API
    API->>DB: SELECT source
    DB-->>API: row
    API-->>App: 200 OK
    deactivate API

    alt Caché vacía
        App->>API: sync library
        API-->>App: diagrams[]
    else Caché al día
        App-->>User: mostrar desde IndexedDB
    end

    loop cada etiqueta
        App->>App: render tag chip
    end

    opt Sin conexión
        App-->>User: modo sin red
    end

    par En paralelo
        App->>DB: métricas
    and
        App->>API: renovar el token
    end

    Note right of App: La vista previa se dibuja en el navegador

    App-->>User: Vista previa SVG
    deactivate App`,
    classDiagram: `classDiagram
    %% Diagrama de clases: herencia, composición y dependencias
    direction LR

    class Animal {
        +String name
        +move()
    }

    class Dog {
        +String breed
        +bark()
    }

    class Feedable {
        <<interface>>
        +feed(food)
    }

    class Order {
        +number total
        +addItem(item)
    }

    class Item {
        +String title
        +number price
    }

    namespace Dominio {
        class Animal
        class Dog
    }

    Animal <|-- Dog
    Dog ..|> Feedable
    Order "1" *-- "*" Item : contiene
    Dog --> Order : crea

    note for Dog "Compañero leal"`,
    state: `stateDiagram-v2
    %% Diagrama de estados: transiciones y notas
    [*] --> Idle
    Idle --> Editing : open
    Editing --> Validating : validate
    Validating --> Rendering : ok
    Validating --> Editing : errors
    Rendering --> Preview : success
    Rendering --> Error : failure
    Preview --> Idle : new diagram
    Error --> Editing : retry
    Preview --> [*] : export done

    state Validating {
        [*] --> Check
        Check --> Passed: ok
        Check --> Failed: errors
    }

    note right of Validating
        Comprobación de sintaxis
        antes de dibujar
    end note`,
    er: `erDiagram
    %% Diagrama ER: entidades y cardinalidades
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "ordered in"
    EMPLOYEE ||--o{ ORDER : processes

    CUSTOMER {
        string id PK
        string email
        string name
    }

    ORDER {
        string id PK
        date created_at
        string status
    }

    PRODUCT {
        string sku PK
        string title
        number price
    }`,
    gantt: `gantt
title Plan de lanzamiento de Code2Graph
dateFormat YYYY-MM-DD
axisFormat %d/%m
excludes weekends

section Preparación
Análisis de requisitos  :done, a1, 2024-01-02, 5d
Prototipo de UI         :done, a2, after a1, 4d

section Desarrollo
Soporte de Mermaid      :active, d1, 2024-01-15, 7d
Vista de GraphML        :d2, after d1, 5d
Pruebas e i18n          :d3, after d2, 4d

section Lanzamiento
Compilación single HTML :r1, after d3, 2d
Publicación             :milestone, m1, after r1, 0d`,
  },
  zh: {
    flowchart: `flowchart TD
    %% 流程图：条件、子图与样式
    A([开始]) --> B{有效？}
    B -->|是| C[处理]
    B -->|否| D[错误]
    C --> E{导出？}
    E -->|SVG| F[下载 SVG]
    E -->|PNG| G[下载 PNG]
    F --> H([完成])
    G --> H
    D --> H

    subgraph 编辑器
      C
      E
    end

    classDef ok fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef warn fill:#FFF3E0,stroke:#E65100,color:#BF360C
    class C,F,G ok
    class D warn
    linkStyle 0 stroke:#1565C0,stroke-width:2px
    click A "https://example.com" "打开"`,
    sequence: `sequenceDiagram
    %% 时序图：参与者、alt/opt/loop
    autonumber
    actor User as 用户
    participant App as "Web App"
    participant API as "Library API"
    participant DB as "SQLite"

    User->>App: 打开图表
    activate App
    App->>API: GET /diagrams/:id
    activate API
    API->>DB: SELECT source
    DB-->>API: row
    API-->>App: 200 OK
    deactivate API

    alt 缓存为空
        App->>API: sync library
        API-->>App: diagrams[]
    else 缓存仍有效
        App-->>User: 从 IndexedDB 显示
    end

    loop 每个标签
        App->>App: render tag chip
    end

    opt 离线
        App-->>User: 无网络模式
    end

    par 并行
        App->>DB: 指标
    and
        App->>API: 刷新令牌
    end

    Note right of App: 预览在浏览器中绘制

    App-->>User: SVG 预览
    deactivate App`,
    classDiagram: `classDiagram
    %% 类图：继承、组合与依赖
    direction LR

    class Animal {
        +String name
        +move()
    }

    class Dog {
        +String breed
        +bark()
    }

    class Feedable {
        <<interface>>
        +feed(food)
    }

    class Order {
        +number total
        +addItem(item)
    }

    class Item {
        +String title
        +number price
    }

    namespace 领域 {
        class Animal
        class Dog
    }

    Animal <|-- Dog
    Dog ..|> Feedable
    Order "1" *-- "*" Item : 包含
    Dog --> Order : 创建

    note for Dog "忠实的伙伴"`,
    state: `stateDiagram-v2
    %% 状态图：转移与注释
    [*] --> Idle
    Idle --> Editing : open
    Editing --> Validating : validate
    Validating --> Rendering : ok
    Validating --> Editing : errors
    Rendering --> Preview : success
    Rendering --> Error : failure
    Preview --> Idle : new diagram
    Error --> Editing : retry
    Preview --> [*] : export done

    state Validating {
        [*] --> Check
        Check --> Passed: ok
        Check --> Failed: errors
    }

    note right of Validating
        渲染前
        检查语法
    end note`,
    er: `erDiagram
    %% ER 图：实体与基数
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "ordered in"
    EMPLOYEE ||--o{ ORDER : processes

    CUSTOMER {
        string id PK
        string email
        string name
    }

    ORDER {
        string id PK
        date created_at
        string status
    }

    PRODUCT {
        string sku PK
        string title
        number price
    }`,
    gantt: `gantt
title Code2Graph 发布计划
dateFormat YYYY-MM-DD
axisFormat %m月%d日
excludes weekends

section 准备
需求分析           :done, a1, 2024-01-02, 5d
界面原型           :done, a2, after a1, 4d

section 开发
Mermaid 支持       :active, d1, 2024-01-15, 7d
GraphML 查看       :d2, after d1, 5d
测试与 i18n        :d3, after d2, 4d

section 发布
单一 HTML 构建     :r1, after d3, 2d
公开发布           :milestone, m1, after r1, 0d`,
  },
  ja: {
    flowchart: `flowchart TD
    %% フローチャート：条件、サブグラフ、スタイル
    A([開始]) --> B{有効？}
    B -->|はい| C[処理]
    B -->|いいえ| D[エラー]
    C --> E{書き出し？}
    E -->|SVG| F[SVG をダウンロード]
    E -->|PNG| G[PNG をダウンロード]
    F --> H([完了])
    G --> H
    D --> H

    subgraph エディタ
      C
      E
    end

    classDef ok fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef warn fill:#FFF3E0,stroke:#E65100,color:#BF360C
    class C,F,G ok
    class D warn
    linkStyle 0 stroke:#1565C0,stroke-width:2px
    click A "https://example.com" "開く"`,
    sequence: `sequenceDiagram
    %% シーケンス図：参加者、alt/opt/loop
    autonumber
    actor User as ユーザー
    participant App as "Web App"
    participant API as "Library API"
    participant DB as "SQLite"

    User->>App: 図を開く
    activate App
    App->>API: GET /diagrams/:id
    activate API
    API->>DB: SELECT source
    DB-->>API: row
    API-->>App: 200 OK
    deactivate API

    alt キャッシュが空
        App->>API: sync library
        API-->>App: diagrams[]
    else キャッシュは最新
        App-->>User: IndexedDB から表示
    end

    loop 各タグ
        App->>App: render tag chip
    end

    opt オフライン
        App-->>User: ネットワークなしのモード
    end

    par 並行
        App->>DB: メトリクス
    and
        App->>API: トークンを更新
    end

    Note right of App: プレビューはブラウザで描画される

    App-->>User: SVG プレビュー
    deactivate App`,
    classDiagram: `classDiagram
    %% クラス図：継承、コンポジション、依存関係
    direction LR

    class Animal {
        +String name
        +move()
    }

    class Dog {
        +String breed
        +bark()
    }

    class Feedable {
        <<interface>>
        +feed(food)
    }

    class Order {
        +number total
        +addItem(item)
    }

    class Item {
        +String title
        +number price
    }

    namespace ドメイン {
        class Animal
        class Dog
    }

    Animal <|-- Dog
    Dog ..|> Feedable
    Order "1" *-- "*" Item : 含む
    Dog --> Order : 作成する

    note for Dog "忠実な相棒"`,
    state: `stateDiagram-v2
    %% 状態図：遷移と注釈
    [*] --> Idle
    Idle --> Editing : open
    Editing --> Validating : validate
    Validating --> Rendering : ok
    Validating --> Editing : errors
    Rendering --> Preview : success
    Rendering --> Error : failure
    Preview --> Idle : new diagram
    Error --> Editing : retry
    Preview --> [*] : export done

    state Validating {
        [*] --> Check
        Check --> Passed: ok
        Check --> Failed: errors
    }

    note right of Validating
        描画前の
        構文チェック
    end note`,
    er: `erDiagram
    %% ER 図：エンティティと多重度
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "ordered in"
    EMPLOYEE ||--o{ ORDER : processes

    CUSTOMER {
        string id PK
        string email
        string name
    }

    ORDER {
        string id PK
        date created_at
        string status
    }

    PRODUCT {
        string sku PK
        string title
        number price
    }`,
    gantt: `gantt
title Code2Graph リリース計画
dateFormat YYYY-MM-DD
axisFormat %m月%d日
excludes weekends

section 準備
要件分析            :done, a1, 2024-01-02, 5d
UI プロトタイプ     :done, a2, after a1, 4d

section 開発
Mermaid 対応        :active, d1, 2024-01-15, 7d
GraphML 表示        :d2, after d1, 5d
テストと i18n       :d3, after d2, 4d

section リリース
単一 HTML のビルド  :r1, after d3, 2d
公開                :milestone, m1, after r1, 0d`,
  },
  hi: {
    flowchart: `flowchart TD
    %% प्रवाह आरेख: शर्तें, उपग्राफ और शैलियाँ
    A([प्रारंभ]) --> B{मान्य?}
    B -->|हाँ| C[प्रसंस्करण]
    B -->|नहीं| D[त्रुटि]
    C --> E{निर्यात?}
    E -->|SVG| F[SVG डाउनलोड करें]
    E -->|PNG| G[PNG डाउनलोड करें]
    F --> H([पूर्ण])
    G --> H
    D --> H

    subgraph संपादक
      C
      E
    end

    classDef ok fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef warn fill:#FFF3E0,stroke:#E65100,color:#BF360C
    class C,F,G ok
    class D warn
    linkStyle 0 stroke:#1565C0,stroke-width:2px
    click A "https://example.com" "खोलें"`,
    sequence: `sequenceDiagram
    %% अनुक्रम आरेख: प्रतिभागी, alt/opt/loop
    autonumber
    actor User as उपयोगकर्ता
    participant App as "Web App"
    participant API as "Library API"
    participant DB as "SQLite"

    User->>App: आरेख खोलें
    activate App
    App->>API: GET /diagrams/:id
    activate API
    API->>DB: SELECT source
    DB-->>API: row
    API-->>App: 200 OK
    deactivate API

    alt कैश खाली है
        App->>API: sync library
        API-->>App: diagrams[]
    else कैश अद्यतन है
        App-->>User: IndexedDB से दिखाएँ
    end

    loop प्रत्येक टैग
        App->>App: render tag chip
    end

    opt ऑफ़लाइन
        App-->>User: बिना नेटवर्क का मोड
    end

    par समानांतर
        App->>DB: मेट्रिक्स
    and
        App->>API: टोकन नवीनीकृत करें
    end

    Note right of App: पूर्वावलोकन ब्राउज़र में बनता है

    App-->>User: SVG पूर्वावलोकन
    deactivate App`,
    classDiagram: `classDiagram
    %% वर्ग आरेख: वंशानुक्रम, संयोजन और निर्भरताएँ
    direction LR

    class Animal {
        +String name
        +move()
    }

    class Dog {
        +String breed
        +bark()
    }

    class Feedable {
        <<interface>>
        +feed(food)
    }

    class Order {
        +number total
        +addItem(item)
    }

    class Item {
        +String title
        +number price
    }

    namespace डोमेन {
        class Animal
        class Dog
    }

    Animal <|-- Dog
    Dog ..|> Feedable
    Order "1" *-- "*" Item : रखता है
    Dog --> Order : बनाता है

    note for Dog "वफादार साथी"`,
    state: `stateDiagram-v2
    %% अवस्था आरेख: संक्रमण और टिप्पणियाँ
    [*] --> Idle
    Idle --> Editing : open
    Editing --> Validating : validate
    Validating --> Rendering : ok
    Validating --> Editing : errors
    Rendering --> Preview : success
    Rendering --> Error : failure
    Preview --> Idle : new diagram
    Error --> Editing : retry
    Preview --> [*] : export done

    state Validating {
        [*] --> Check
        Check --> Passed: ok
        Check --> Failed: errors
    }

    note right of Validating
        रेंडर से पहले
        वाक्य-रचना की जाँच
    end note`,
    er: `erDiagram
    %% ER आरेख: निकाय और संबंधों की गणन्यता
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "ordered in"
    EMPLOYEE ||--o{ ORDER : processes

    CUSTOMER {
        string id PK
        string email
        string name
    }

    ORDER {
        string id PK
        date created_at
        string status
    }

    PRODUCT {
        string sku PK
        string title
        number price
    }`,
    gantt: `gantt
title Code2Graph रिलीज़ योजना
dateFormat YYYY-MM-DD
axisFormat %d/%m
excludes weekends

section तैयारी
आवश्यकता विश्लेषण    :done, a1, 2024-01-02, 5d
UI प्रोटोटाइप         :done, a2, after a1, 4d

section विकास
Mermaid समर्थन        :active, d1, 2024-01-15, 7d
GraphML दृश्य         :d2, after d1, 5d
परीक्षण और i18n       :d3, after d2, 4d

section रिलीज़
एकल HTML निर्माण      :r1, after d3, 2d
प्रकाशन               :milestone, m1, after r1, 0d`,
  },
  pt: {
    flowchart: `flowchart TD
    %% Fluxograma: condições, subgrafos e estilos
    A([Início]) --> B{Válido?}
    B -->|sim| C[Processar]
    B -->|não| D[Falha]
    C --> E{Exportar?}
    E -->|SVG| F[Baixar SVG]
    E -->|PNG| G[Baixar PNG]
    F --> H([Pronto])
    G --> H
    D --> H

    subgraph Edição
      C
      E
    end

    classDef ok fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef warn fill:#FFF3E0,stroke:#E65100,color:#BF360C
    class C,F,G ok
    class D warn
    linkStyle 0 stroke:#1565C0,stroke-width:2px
    click A "https://example.com" "Abrir"`,
    sequence: `sequenceDiagram
    %% Diagrama de sequência: participantes, alt/opt/loop
    autonumber
    actor User as Usuário
    participant App as "Web App"
    participant API as "Library API"
    participant DB as "SQLite"

    User->>App: Abrir diagrama
    activate App
    App->>API: GET /diagrams/:id
    activate API
    API->>DB: SELECT source
    DB-->>API: row
    API-->>App: 200 OK
    deactivate API

    alt Cache vazio
        App->>API: sync library
        API-->>App: diagrams[]
    else Cache atualizado
        App-->>User: mostrar do IndexedDB
    end

    loop cada etiqueta
        App->>App: render tag chip
    end

    opt Sem conexão
        App-->>User: modo sem rede
    end

    par Em paralelo
        App->>DB: métricas
    and
        App->>API: atualizar o token
    end

    Note right of App: A prévia é desenhada no navegador

    App-->>User: Prévia SVG
    deactivate App`,
    classDiagram: `classDiagram
    %% Diagrama de classes: herança, composição e dependências
    direction LR

    class Animal {
        +String name
        +move()
    }

    class Dog {
        +String breed
        +bark()
    }

    class Feedable {
        <<interface>>
        +feed(food)
    }

    class Order {
        +number total
        +addItem(item)
    }

    class Item {
        +String title
        +number price
    }

    namespace Domínio {
        class Animal
        class Dog
    }

    Animal <|-- Dog
    Dog ..|> Feedable
    Order "1" *-- "*" Item : contém
    Dog --> Order : cria

    note for Dog "Companheiro leal"`,
    state: `stateDiagram-v2
    %% Diagrama de estados: transições e notas
    [*] --> Idle
    Idle --> Editing : open
    Editing --> Validating : validate
    Validating --> Rendering : ok
    Validating --> Editing : errors
    Rendering --> Preview : success
    Rendering --> Error : failure
    Preview --> Idle : new diagram
    Error --> Editing : retry
    Preview --> [*] : export done

    state Validating {
        [*] --> Check
        Check --> Passed: ok
        Check --> Failed: errors
    }

    note right of Validating
        Verificação de sintaxe
        antes de desenhar
    end note`,
    er: `erDiagram
    %% Diagrama ER: entidades e cardinalidades
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "ordered in"
    EMPLOYEE ||--o{ ORDER : processes

    CUSTOMER {
        string id PK
        string email
        string name
    }

    ORDER {
        string id PK
        date created_at
        string status
    }

    PRODUCT {
        string sku PK
        string title
        number price
    }`,
    gantt: `gantt
title Plano de lançamento do Code2Graph
dateFormat YYYY-MM-DD
axisFormat %d/%m
excludes weekends

section Preparação
Análise de requisitos   :done, a1, 2024-01-02, 5d
Protótipo de UI         :done, a2, after a1, 4d

section Desenvolvimento
Suporte ao Mermaid      :active, d1, 2024-01-15, 7d
Visualização GraphML    :d2, after d1, 5d
Testes e i18n           :d3, after d2, 4d

section Lançamento
Build de HTML único     :r1, after d3, 2d
Publicação              :milestone, m1, after r1, 0d`,
  },
  de: {
    flowchart: `flowchart TD
    %% Flussdiagramm: Bedingungen, Teilgraphen und Stile
    A([Beginn]) --> B{Gültig?}
    B -->|ja| C[Verarbeitung]
    B -->|nein| D[Fehler]
    C --> E{Exportieren?}
    E -->|SVG| F[SVG herunterladen]
    E -->|PNG| G[PNG herunterladen]
    F --> H([Fertig])
    G --> H
    D --> H

    subgraph Bearbeitung
      C
      E
    end

    classDef ok fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef warn fill:#FFF3E0,stroke:#E65100,color:#BF360C
    class C,F,G ok
    class D warn
    linkStyle 0 stroke:#1565C0,stroke-width:2px
    click A "https://example.com" "Öffnen"`,
    sequence: `sequenceDiagram
    %% Sequenzdiagramm: Teilnehmer, alt/opt/loop
    autonumber
    actor User as Benutzer
    participant App as "Web App"
    participant API as "Library API"
    participant DB as "SQLite"

    User->>App: Diagramm öffnen
    activate App
    App->>API: GET /diagrams/:id
    activate API
    API->>DB: SELECT source
    DB-->>API: row
    API-->>App: 200 OK
    deactivate API

    alt Cache leer
        App->>API: sync library
        API-->>App: diagrams[]
    else Cache aktuell
        App-->>User: aus IndexedDB anzeigen
    end

    loop jedes Etikett
        App->>App: render tag chip
    end

    opt Ohne Netz
        App-->>User: Modus ohne Netzwerk
    end

    par Parallel
        App->>DB: Metriken
    and
        App->>API: Token aktualisieren
    end

    Note right of App: Die Vorschau wird im Browser gezeichnet

    App-->>User: SVG-Vorschau
    deactivate App`,
    classDiagram: `classDiagram
    %% Klassendiagramm: Vererbung, Komposition, Abhängigkeiten
    direction LR

    class Animal {
        +String name
        +move()
    }

    class Dog {
        +String breed
        +bark()
    }

    class Feedable {
        <<interface>>
        +feed(food)
    }

    class Order {
        +number total
        +addItem(item)
    }

    class Item {
        +String title
        +number price
    }

    namespace Domäne {
        class Animal
        class Dog
    }

    Animal <|-- Dog
    Dog ..|> Feedable
    Order "1" *-- "*" Item : enthält
    Dog --> Order : erstellt

    note for Dog "Treuer Begleiter"`,
    state: `stateDiagram-v2
    %% Zustandsdiagramm: Übergänge und Notizen
    [*] --> Idle
    Idle --> Editing : open
    Editing --> Validating : validate
    Validating --> Rendering : ok
    Validating --> Editing : errors
    Rendering --> Preview : success
    Rendering --> Error : failure
    Preview --> Idle : new diagram
    Error --> Editing : retry
    Preview --> [*] : export done

    state Validating {
        [*] --> Check
        Check --> Passed: ok
        Check --> Failed: errors
    }

    note right of Validating
        Syntaxprüfung
        vor dem Zeichnen
    end note`,
    er: `erDiagram
    %% ER-Diagramm: Entitäten und Kardinalitäten
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "ordered in"
    EMPLOYEE ||--o{ ORDER : processes

    CUSTOMER {
        string id PK
        string email
        string name
    }

    ORDER {
        string id PK
        date created_at
        string status
    }

    PRODUCT {
        string sku PK
        string title
        number price
    }`,
    gantt: `gantt
title Code2Graph-Releaseplan
dateFormat YYYY-MM-DD
axisFormat %d.%m
excludes weekends

section Vorbereitung
Anforderungsanalyse   :done, a1, 2024-01-02, 5d
UI-Prototyp           :done, a2, after a1, 4d

section Entwicklung
Mermaid-Unterstützung :active, d1, 2024-01-15, 7d
GraphML-Ansicht       :d2, after d1, 5d
Tests und i18n        :d3, after d2, 4d

section Freigabe
Einzelnes HTML bauen  :r1, after d3, 2d
Veröffentlichen       :milestone, m1, after r1, 0d`,
  },
  ar: {
    flowchart: `flowchart TD
    %% مخطط تدفقي: شروط ورسوم فرعية وأنماط
    A([البداية]) --> B{صالح؟}
    B -->|نعم| C[معالجة]
    B -->|لا| D[خطأ]
    C --> E{تصدير؟}
    E -->|SVG| F[تنزيل SVG]
    E -->|PNG| G[تنزيل PNG]
    F --> H([تم])
    G --> H
    D --> H

    subgraph المحرر
      C
      E
    end

    classDef ok fill:#E8F5E9,stroke:#2E7D32,color:#1B5E20
    classDef warn fill:#FFF3E0,stroke:#E65100,color:#BF360C
    class C,F,G ok
    class D warn
    linkStyle 0 stroke:#1565C0,stroke-width:2px
    click A "https://example.com" "فتح"`,
    sequence: `sequenceDiagram
    %% مخطط تسلسل: المشاركون و alt/opt/loop
    autonumber
    actor User as المستخدم
    participant App as "Web App"
    participant API as "Library API"
    participant DB as "SQLite"

    User->>App: فتح المخطط
    activate App
    App->>API: GET /diagrams/:id
    activate API
    API->>DB: SELECT source
    DB-->>API: row
    API-->>App: 200 OK
    deactivate API

    alt الذاكرة المؤقتة فارغة
        App->>API: sync library
        API-->>App: diagrams[]
    else الذاكرة المؤقتة حديثة
        App-->>User: عرض من IndexedDB
    end

    loop كل وسم
        App->>App: render tag chip
    end

    opt دون اتصال
        App-->>User: وضع بلا شبكة
    end

    par بالتوازي
        App->>DB: المقاييس
    and
        App->>API: تحديث الرمز
    end

    Note right of App: تُرسم المعاينة في المتصفح

    App-->>User: معاينة SVG
    deactivate App`,
    classDiagram: `classDiagram
    %% مخطط أصناف: وراثة وتركيب وتبعيات
    direction LR

    class Animal {
        +String name
        +move()
    }

    class Dog {
        +String breed
        +bark()
    }

    class Feedable {
        <<interface>>
        +feed(food)
    }

    class Order {
        +number total
        +addItem(item)
    }

    class Item {
        +String title
        +number price
    }

    namespace النطاق {
        class Animal
        class Dog
    }

    Animal <|-- Dog
    Dog ..|> Feedable
    Order "1" *-- "*" Item : يحتوي
    Dog --> Order : ينشئ

    note for Dog "رفيق وفيّ"`,
    state: `stateDiagram-v2
    %% مخطط حالات: انتقالات وملاحظات
    [*] --> Idle
    Idle --> Editing : open
    Editing --> Validating : validate
    Validating --> Rendering : ok
    Validating --> Editing : errors
    Rendering --> Preview : success
    Rendering --> Error : failure
    Preview --> Idle : new diagram
    Error --> Editing : retry
    Preview --> [*] : export done

    state Validating {
        [*] --> Check
        Check --> Passed: ok
        Check --> Failed: errors
    }

    note right of Validating
        فحص الصياغة
        قبل الرسم
    end note`,
    er: `erDiagram
    %% مخطط ER: الكيانات وتعدّد العلاقات
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "ordered in"
    EMPLOYEE ||--o{ ORDER : processes

    CUSTOMER {
        string id PK
        string email
        string name
    }

    ORDER {
        string id PK
        date created_at
        string status
    }

    PRODUCT {
        string sku PK
        string title
        number price
    }`,
    gantt: `gantt
title خطة إصدار Code2Graph
dateFormat YYYY-MM-DD
axisFormat %d/%m
excludes weekends

section التحضير
تحليل المتطلبات       :done, a1, 2024-01-02, 5d
نموذج الواجهة         :done, a2, after a1, 4d

section التطوير
دعم Mermaid           :active, d1, 2024-01-15, 7d
عرض GraphML           :d2, after d1, 5d
اختبارات و i18n       :d3, after d2, 4d

section الإصدار
بناء HTML واحد        :r1, after d3, 2d
نشر                   :milestone, m1, after r1, 0d`,
  },
};
