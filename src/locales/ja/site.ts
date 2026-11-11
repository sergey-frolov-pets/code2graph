import type { LocaleMessages } from "../types";

export const siteMessages = {
  "site.tagline": "コードで図を描くスタジオ",
  "site.nav.features": "機能",
  "site.nav.converter": "変換と AI",
  "site.nav.pwa": "PWA / オフライン",
  "site.nav.formats": "形式",
  "site.nav.faq": "よくある質問",
  "site.nav.mcp": "MCP",
  "site.nav.github": "GitHub",
  "site.nav.discussions": "ディスカッション",
  "site.hero.askQuestion": "💬 質問する",
  "site.github.star": "スター",
  "site.github.starLabel": "GitHub で code2graph にスターを付ける",
  "site.hero.viewOnGithub": "GitHub で見る",

  "site.landingTitle": "Code2Graph",
  "site.landingSubtitle":
    "PlantUML、Mermaid、GraphML、WireMark、D2、Structurizr の PWA スタジオです。エージェント向け MCP は図のソースと画像を返します。",
  "site.landingCtaApp": "エディタを開く",
  "site.landingCtaInstallPwa": "📲 PWA をインストール",
  "site.landingCtaRegister": "登録",
  "site.landingCtaLogin": "サインイン",
  "site.landingCtaTryFree": "無料で試す",
  "site.landingCtaDemo": "デモ",

  "site.hero.title": "ブラウザでテキストの図を",
  "site.hero.subtitle":
    "図を書いて、すぐに見られます。PlantUML、Mermaid、GraphML、WireMark、D2、Structurizr。オフラインも含みます。MCP はエージェントにソースと画像を渡します。",
  "site.offlineNote": "編集とプレビューはネットワークなしで動作します。",
  "site.languages.title": "言語",
  "site.language.sites": "サイト",
  "site.language.libraries": "アプリで使うライブラリ",
  "site.language.types": "主な図の種類",
  "site.language.diagramTypes": "図の種類",
  "site.language.keywords": "キーワード",
  "site.language.example": "例",
  "site.language.syntax": "構文",
  "site.language.preview": "見た目: {title}",
  "site.language.previewFailed": "サンプルを描けませんでした",
  "site.primer.graphml.type.directed.title": "有向グラフ",
  "site.primer.graphml.type.directed.summary":
    "エッジはソースからターゲットへ向かいます。Code2Graph は既定で GraphML をこのように描きます。",
  "site.primer.graphml.type.undirected.title": "無向グラフ",
  "site.primer.graphml.type.undirected.summary":
    "エッジはノードをつなぐだけで、向きはありません。",
  "site.primer.wiremark.type.flow.title": "つながった画面",
  "site.primer.wiremark.type.flow.summary":
    "1 つのファイルに複数のワイヤーフレームがあり、to=#anchor で互いへ飛びます。",
  "site.primer.plantuml.kw.startuml":
    "@startuml と @enduml が図を開き、閉じます。",
  "site.primer.plantuml.kw.participant":
    "名前付きの生存線です。as で短い別名を付けます。",
  "site.primer.plantuml.kw.arrow": "メッセージです。-> は参加者へ向かい、--> は返信です。",
  "site.primer.plantuml.kw.alt":
    "互いに排他な分岐です。else がもう一方、end がブロックを閉じます。",
  "site.primer.plantuml.kw.note": "参加者の左、右、または上へのノートです。",
  "site.primer.plantuml.kw.if":
    "アクティビティの判断です。then と else があり、endif で閉じます。",
  "site.primer.plantuml.kw.skinparam":
    "背景色のような、共通のスタイル設定です。",
  "site.primer.plantuml.syntax.sequence":
    "actor と participant が生存線に名前を付け、as が短い別名です。メッセージは ->、返信は -->、ラベルはコロンの後です。",
  "site.primer.plantuml.syntax.class":
    "class がクラスを開きます。フィールドとメソッドは波括弧の中です。リンクは --> で、多重度は引用符の中です。",
  "site.primer.plantuml.syntax.activity":
    "start と stop が端です。手順は :テキスト; です。判断は if () then ()、else、endif です。",
  "site.primer.plantuml.syntax.state":
    "[*] が開始と終了です。遷移は --> で、イベントのラベルはコロンの後です。",
  "site.primer.plantuml.syntax.usecase":
    "actor と usecase がアクターとケースを宣言します。リンクは -->、向きは left to right direction です。",
  "site.primer.plantuml.syntax.c4_context":
    "Person()、System()、Rel() が人、システム、リンクを表します。ライブラリは !include で取り込みます。",
  "site.primer.mermaid.kw.participant":
    "シーケンスの参加者です。as が見えるラベルを置き換えます。",
  "site.primer.mermaid.kw.arrow":
    "メッセージです。->> は実線の矢印、-->> は点線の返信です。",
  "site.primer.mermaid.kw.alt":
    "シーケンスの分岐です。else がもう一方、end がブロックを閉じます。",
  "site.primer.mermaid.kw.note": "参加者の右、または複数の上へのノートです。",
  "site.primer.mermaid.kw.subgraph": "フローチャートのノードのグループです。end で閉じます。",
  "site.primer.mermaid.kw.class": "classDiagram の中の、フィールドとメソッドを持つクラスです。",
  "site.primer.mermaid.kw.section": "ガントチャート上のタスクのグループです。",
  "site.primer.mermaid.syntax.flowchart":
    "flowchart TD が向きを決めます。手順は [text]、判断は {text}、開始は ([text]) です。矢印は -->、分岐ラベルは |yes| です。",
  "site.primer.mermaid.syntax.sequence":
    "sequenceDiagram が図を開きます。actor と participant、および as が生存線に名前を付けます。依頼は ->>、返信は -->> です。",
  "site.primer.mermaid.syntax.class":
    "classDiagram が図を開きます。class 名前 { } が +名前 型のフィールドとメソッドを持ちます。リンクは --> です。",
  "site.primer.mermaid.syntax.state":
    "stateDiagram-v2 が図を開きます。[*] が開始です。遷移は --> で、ラベルはコロンの後です。",
  "site.primer.mermaid.syntax.er":
    "erDiagram が図を開きます。||--o{ は一対多で、役割はコロンの後です。",
  "site.primer.mermaid.syntax.gantt":
    "gantt がチャートを開きます。title は見出し、dateFormat は日付のパターン、section はグループです。タスクは 名前 :id, 日付, 期間 です。",
  "site.primer.mermaid.syntax.mindmap":
    "mindmap がマップを開きます。ルートは root((トピック)) です。インデントが入れ子を決めます。",
  "site.primer.mermaid.syntax.pie":
    "pie showData が数値を表示します。title は見出しです。スライスは \"名前\" : 数値 です。",
  "site.primer.mermaid.syntax.journey":
    "journey が経路を開きます。title は見出し、section は段階です。タスクは 名前: スコア: 役割 です。",
  "site.primer.mermaid.syntax.gitgraph":
    "gitGraph が履歴を開きます。commit はコミット、branch はブランチ、checkout は切り替え、merge は合流です。",
  "site.primer.mermaid.syntax.timeline":
    "timeline が目盛りを開きます。title は見出し、section は期間です。イベントはコロンの後です。",
  "site.primer.mermaid.syntax.sankey":
    "sankey-beta がフローを開きます。各行は ソース,ターゲット,重み です。ノード名は ASCII です。カンマを含む名前は引用符で囲みます。オプションは CSV の列ではありません。キーワードの前の config.sankey の YAML ヘッダーで指定します（showValues、prefix、suffix、linkColor、nodeAlignment、width、height、useMaxWidth、nodeWidth、nodePadding、labelStyle、nodeColors）。",
  "site.primer.mermaid.syntax.xychart":
    "xychart-beta がチャートを開きます。x-axis はカテゴリ、y-axis は範囲、bar と line は系列です。",
  "site.primer.mermaid.syntax.block":
    "block-beta がブロックを開きます。columns が列数です。ブロックは id[\"ラベル\"]、リンクは --> です。",
  "site.primer.mermaid.syntax.c4_context":
    "C4Context がコンテキストを開きます。Person() と System() が要素を宣言し、Rel() がリンクです。",
  "site.primer.mermaid.syntax.requirement":
    "requirementDiagram が図を開きます。requirement { } が要件、element { } が要素、リンクは satisfies です。",
  "site.primer.mermaid.syntax.quadrant":
    "quadrantChart が四分円を開きます。x-axis と y-axis が軸、quadrant-1 … quadrant-4 が名前、点は 名前: [x, y] です。",
  "site.primer.mermaid.syntax.architecture":
    "architecture-beta が図を開きます。group はグループ、service はサービス、リンクは service:R --> L:service です。",
  "site.primer.mermaid.syntax.packet":
    "packet-beta がパケットを開きます。title は見出しです。フィールドはビット範囲とラベルです。例: 0-15: \"送信元\"。",
  "site.ext.mermaid.title": "Mermaid Ext 拡張",
  "site.ext.mermaid.lead":
    "通常の Mermaid にない 5 種類の図です。ウォーターフォール、バブル、ヒートマップ、組織図、アーンドバリューです。組み込みエンジンが描き、外部サービスは使いません。",
  "site.ext.mermaid.note":
    "5 種類はすべて組み込みエンジンが描き、外部サービスは使いません。下の例がエディタで描かれない場合、このビルドは拡張なしで作られています。",
  "site.ext.mermaid.type.waterfall": "ウォーターフォール",
  "site.ext.mermaid.type.bubble": "バブル",
  "site.ext.mermaid.type.heatmap": "ヒートマップ",
  "site.ext.mermaid.type.orgchart": "組織図",
  "site.ext.mermaid.type.ev": "アーンドバリュー",
  "site.ext.mermaid.type.boxplot": "箱ひげ図",
  "site.ext.mermaid.type.treemap": "ツリーマップ",
  "site.ext.mermaid.type.radar": "レーダーチャート",
  "site.ext.mermaid.type.voronoi": "ボロノイ分割",
  "site.ext.mermaid.type.clustered": "系列チャート",
  "site.ext.mermaid.desc.waterfall":
    "開始値が + と − の段を経て合計になる様子です。絶対値の列は = で始まり、複数のシナリオは series で宣言します。軸の中断、白黒モード（mono と mono invert）、独自の色に対応します。",
  "site.ext.mermaid.desc.bubble":
    "一度に 3 つの次元です。x、y、バブルの大きさです。任意で BCG の四分円と色のグループを付けられます。",
  "site.ext.mermaid.desc.heatmap":
    "色スケール付きの値の行列です。スケールの範囲は明示し、空のセル（区切りが 2 つ続く）は灰色で描きます。",
  "site.ext.mermaid.desc.orgchart":
    "明示的なエッジを持つ報告の木です。実線が本線、点線 -.-> が副担当の上司です。ブロックは塗り（color）と枠（border、style）を指定できます。複数のルートは見えないルートの下に集めます。",
  "site.ext.mermaid.desc.ev":
    "日ごとの 3 本の累積曲線です。計画値 PV、出来高 EV、実績コスト AC です。凡例には偏差 SV と CV も出ます。",
  "site.ext.mermaid.desc.boxplot":
    "カテゴリごとの分布です。最小、下側と上側の四分位（Q1、Q3）、中央値、最大、平均、外れ値です。明示的な五数要約か、生の観測（values=）のどちらも受け取れます。",
  "site.ext.mermaid.desc.treemap":
    "グループと項目を、数値の重みに比例した階層の長方形に分割します。割合は自動で、色の濃淡も付きます。",
  "site.ext.mermaid.desc.radar":
    "共通の中心から放射状の軸で複数の系列を比べます。グリッドの輪、塗りの不透明度、独自の色を設定できます。",
  "site.ext.mermaid.desc.voronoi":
    "平面を、色のグループと重心ラベル付きの、凸な最近傍セルに幾何学的に分割します。",
  "site.ext.mermaid.desc.clustered":
    "カテゴリをまたぐ複数系列の棒です。並べるか積み上げ、線を重ね、水平レベル、軸の中断、CAGR の吹き出し、90 度回転（rotate 90）、縦軸の反転（invert y）、白黒モード（mono、mono invert）に対応します。",
  "site.ext.mermaid.syntax.waterfall":
    "waterfall がチャートを開きます。y が軸です。= は絶対値の列、+ と - は段、ラベルはコロンの後です。ラベル内の \\n は改行です。",
  "site.ext.mermaid.syntax.bubble":
    "bubble がチャートを開きます。x、y、size が軸と大きさを決めます。data の中の点は 名前 : x=, y=, size= です。名前の中の \\n は改行です。",
  "site.ext.mermaid.syntax.heatmap":
    "heatmap がマップを開きます。x と y は軸のラベルです。data の中の行は 名前 : カンマ区切りの数値 です。ラベル内の \\n は改行です。",
  "site.ext.mermaid.syntax.orgchart":
    "orgchart が木を開きます。ノードは id [役割\\n名前] です（\\n は改行、箱はテキストに合わせます）。color=#hex が塗り、border=#hex と style=solid|dash|dot|dashdot が枠の色とスタイルです。実線のエッジは ->、副担当の上司は -.-> です。",
  "site.ext.mermaid.syntax.ev":
    "ev がチャートを開きます。days が日、pv が計画、ev が出来高、ac が実績コストです。日のラベル内の \\n は改行です。",
  "site.ext.mermaid.syntax.boxplot":
    "boxplot がチャートを開きます。カテゴリの行は 名前 : min=, q1=, median=, q3=, max=（または values=v1, v2, …）で、任意で color=#hex です。名前の中の \\n は改行です。",
  "site.ext.mermaid.syntax.treemap":
    "treemap がマップを開きます。行は グループ / 項目 : 重み [color=#hex] です。labels が値と割合の表示を制御します。名前の中の \\n は改行です。",
  "site.ext.mermaid.syntax.radar":
    "radar がチャートを開きます。axes が軸のラベル一覧、series 名前 : v1, v2, … がデータ系列です。ラベル内の \\n は改行です。",
  "site.ext.mermaid.syntax.voronoi":
    "voronoi が分割を開きます。data の中の地点は 名前 : x=, y=, group=, color=#hex です。名前の中の \\n は改行です。",
  "site.ext.mermaid.syntax.clustered":
    "series がチャートを開きます。categories がカテゴリ一覧、series 名前 : v1, v2, … が棒で、名前は省略できます（`series : v1, v2`）。空の枠、\"-\"、null はその棒を飛ばします。line ラベル : v1, v2, … が線で、ラベルは省略できます（`line : v1, v2`）。飛ばした枠は両隣の点をつなぎ、ラベルはプロットの右に出ます。color と style=solid|dash|dot|dashdot が線を決めます。line 160 \"計画\" は水平レベルです（コロンなし）。break 200 --> 700 は軸から区間を切り取ります。cagr は最初の棒から最後の棒までの CAGR、cagr 2, 7 はそれらの棒をつなぎます。format、prefix、label が楕円を制御します。format=\"±0.0%\" は値が正のときだけプラスを付けます。重ならない矢印は同じ段を共有します。連続する cagr の行は 1 つの系列に適用されます。stacked は系列を積み、stacked off は棒を並べ、rotate 90 はチャートを回転します。invert y を rotate 90 と併用すると最初のカテゴリが下になり、invert y off は上から下の順に戻します。ラベル内の \\n は改行です。y2 \"ラベル\" 0 --> 40 は第二の目盛りを描き（右側、rotate 90 では上側）、axis=y2 は系列・折れ線・レベル線をそれに結びます。",
  "site.primer.graphml.kw.graphml":
    "文書のルートです。GraphML の名前空間が必要です。",
  "site.primer.graphml.kw.graph":
    "グラフそのものです。edgedefault は directed または undirected です。",
  "site.primer.graphml.kw.node": "頂点です。id は一意である必要があります。",
  "site.primer.graphml.kw.edge": "エッジです。source と target はノードの id を指します。",
  "site.primer.graphml.kw.key": "ノードまたはエッジの属性を宣言します。",
  "site.primer.graphml.kw.data":
    "属性の値です。見えるラベルはここにあって、id の中ではありません。",
  "site.primer.graphml.syntax.directed":
    "graphml がルート、graph edgedefault=\"directed\" が有向グラフです。node は頂点、edge の source と target はエッジ、data はラベルです。",
  "site.primer.graphml.syntax.undirected":
    "同じ形で、edgedefault=\"undirected\" です。エッジはノードをつなぐだけです。",
  "site.primer.wiremark.kw.wireframe":
    "1 つの画面です。# の後の名前は、ほかの画面がリンクするアンカーです。",
  "site.primer.wiremark.kw.flow":
    "複数の画面をつなぎます。LR はリンクを左から右に描きます。",
  "site.primer.wiremark.kw.stack":
    "列または行です。gap が間隔、インデントが入れ子です。",
  "site.primer.wiremark.kw.typography":
    "テキストです。h4 と body1 がレベルを選び、引用符の文字列がラベルです。",
  "site.primer.wiremark.kw.textfield":
    "入力です。ラベルは引用符で囲み、required のような設定は囲みません。",
  "site.primer.wiremark.kw.button":
    "ボタンです。contained が塗りつぶし、to=#id が別の画面へ飛びます。",
  "site.primer.wiremark.syntax.wireframe":
    "Wireframe #anchor が画面を開きます。Stack が列、Typography がテキスト、TextField が入力、Button がボタンです。",
  "site.primer.wiremark.syntax.flow":
    "Flow LR が画面を左から右につなぎます。ボタンの to=#anchor が別の Wireframe へ飛びます。",
  "site.primer.d2.kw.direction":
    "レイアウトの向きです。down、right、left、up です。",
  "site.primer.d2.kw.shape":
    "ノードの形です。person、cylinder、class、sql_table、sequence_diagram です。",
  "site.primer.d2.kw.arrow": "ノード間のリンクです。ラベルはコロンの後です。",
  "site.primer.d2.kw.style": "ノードのスタイルです。塗り、線、フォントです。",
  "site.primer.d2.kw.constraint":
    "SQL 列の制約です。primary_key、foreign_key、unique です。",
  "site.primer.d2.syntax.flowchart":
    "direction がレイアウトを決めます。shape: person と shape: cylinder がノードの形です。リンクは -> で、ラベルはコロンの後です。",
  "site.primer.d2.syntax.sequence":
    "shape: sequence_diagram がそのブロックをシーケンスにします。参加者は入れ子のノード、メッセージは -> です。",
  "site.primer.d2.syntax.class":
    "shape: class がそのブロックをクラスにします。フィールドとメソッドはブロック内の行、リンクは -> です。",
  "site.primer.d2.syntax.er":
    "shape: sql_table がそのブロックを表にします。constraint: primary_key と foreign_key がキー、リンクは フィールド -> フィールド です。",
  "site.primer.d2.syntax.architecture":
    "入れ子のブロックがノードをまとめます。shape が形、-> がラベル付きリンクです。",
  "site.primer.structurizr.kw.workspace":
    "文書のルートです。モデルの名前と短い説明です。",
  "site.primer.structurizr.kw.person": "システムを使う人です。",
  "site.primer.structurizr.kw.softwareSystem": "モデルの中のソフトウェアシステムです。",
  "site.primer.structurizr.kw.container":
    "システムの中のアプリケーションまたはデータストアです。第 3 引数が技術です。",
  "site.primer.structurizr.kw.arrow":
    "誰が誰を呼ぶかです。関係のラベルは引用符で囲みます。",
  "site.primer.structurizr.kw.views": "モデルからどのビューを描くかです。",
  "site.primer.structurizr.kw.autolayout":
    "ビューの自動レイアウトです。tb は上から下、lr は左から右です。",
  "site.primer.structurizr.syntax.c4_context":
    "workspace が文書を開きます。person と softwareSystem がモデルを表し、-> が関係、systemContext と autolayout がビューを作ります。",
  "site.primer.structurizr.syntax.c4_container":
    "softwareSystem の中の container がアプリケーションです。コンテナビューと include * がコンテナを集めます。",
  "site.primer.structurizr.syntax.component":
    "container の中の component がモジュールを表します。コンポーネントビューがそのコンテナを描きます。",
  "site.primer.structurizr.syntax.deployment":
    "deploymentEnvironment と deploymentNode が環境を表します。containerInstance がコンテナをノードに置き、配置ビューが図を描きます。",
  "site.stackLead": "画面:",
  "site.hero.ctaPrimary": "登録なしでエディタを開く",
  "site.hero.ctaSecondary": "📲 デスクトップ / 電話にインストール",
  "site.hero.trustOffline":
    "📶 オフラインで動作: 中核機能と変換はインターネットなしで使えます。",
  "site.hero.trustAi":
    "🤖 AI とウィザード: テキストから、または案内付きの手順で図を生成します。",
  "site.hero.trustConverter":
    "🔄 3 つの形式の変換: PlantUML、Mermaid、GraphML を即座に相互変換します。",
  "site.hero.trustPwa":
    "💻 PWA アプリ: Windows、macOS、Linux、iOS、Android にインストールできます。",

  "site.pillars.title": "コードで図を描くためのすべてが、1 つの自立したアプリに",
  "site.pillars.item1.title": "🤖 賢い作成（AI とウィザード）",
  "site.pillars.item1.text":
    "構文を手で書きたくないときは、アーキテクチャを平易な文章で AI アシスタントに伝えるか、ウィザードの質問に順に答えてください。数秒で、整った有効な図のコードが得られます。",
  "site.pillars.item2.title": "⚡️ 変換と編集（ライブエディタ）",
  "site.pillars.item2.text":
    "即座のプレビューがあるオンラインエディタです。PlantUML を Mermaid に、Mermaid を GraphML に、そして逆方向へ、ワンクリックで変換します。Notion、GitHub、Draw.io の間の互換の手間をなくします。",
  "site.pillars.item3.title": "📲 PWA、オフライン、保存",
  "site.pillars.item3.text":
    "Code2Graph をノート PC やタブレットのネイティブアプリとしてインストールできます。作業とプロジェクトはローカルとクラウドに保存されるので、機内や接続のない場所でもアーキテクチャを設計できます。",

  "site.deepDive.title": "アーキテクチャ文書を完全にコントロール",
  "site.deepDive.item1.title": "🔄 双方向の形式変換",
  "site.deepDive.item1.text":
    "古い GraphML の図を、リンク、ノード、論理構造を失わずに、現代的な Mermaid や PlantUML の標準へ移します。",
  "site.deepDive.item2.title": "📝 強力なライブエディタ",
  "site.deepDive.item2.text":
    "構文の強調、ヒント、入力補完。待ち時間のない即座の描画です。",
  "site.deepDive.item3.title": "☁️ 保存とローカルアクセス",
  "site.deepDive.item3.text":
    "図を非公開のライブラリに保存します。安全なオフライン作業のための自動 PWA キャッシュです。",
  "site.deepDive.item4.title": "📤 ワンクリックの書き出し",
  "site.deepDive.item4.text":
    "図をベクター（SVG、PDF）またはラスター（PNG）でダウンロードします。Markdown / Confluence 用に、できあがったコードをクリップボードへコピーします。",

  "site.formats.title": "主要な標準を 1 つのツールで",
  "site.formats.colFormat": "形式",
  "site.formats.colPurpose": "用途",
  "site.formats.colFeatures": "Code2Graph でできること",
  "site.formats.plantuml.purpose": "複雑な UML、シーケンス、クラス、状態の図",
  "site.formats.plantuml.features": "編集、AI 生成、Mermaid/GraphML への変換",
  "site.formats.plantuml.summary":
    "シーケンス、クラス、状態、C4 などのテキスト UML です。Code2Graph は @plantuml/core と Smetana レイアウトエンジンでオフライン描画します。C4 と ArchiMate の図は、対応する PlantUML の標準ライブラリを使います。",
  "site.formats.mermaid.purpose": "GitHub、Notion、Obsidian、Jira 向けの軽い図",
  "site.formats.mermaid.features": "ライブプレビュー、ウィザード生成、書き出し",
  "site.formats.mermaid.summary":
    "Markdown、GitHub、ノート向けのコンパクトな図の言語です。エディタはブラウザ内で Mermaid を描き、オンラインモードでは mermaid.ink も使えます。",
  "site.formats.graphml.purpose": "yEd、Draw.io、可視化システム向けのトポロジグラフ",
  "site.formats.graphml.features": "取り込み、可視化、サンプル、コードへの変換",
  "site.formats.graphml.summary":
    "yEd などが使う XML のグラフ形式です。Code2Graph は GraphML を読み、dagre でグラフを配置します。",
  "site.formats.wiremark.purpose": "Markdown の中の手描き風 UI ワイヤーフレーム",
  "site.formats.wiremark.features": "編集、ライブプレビュー、画面のサンプル",
  "site.formats.wiremark.summary":
    "スケッチのように見えるテキストのワイヤーフレームです。アプリ内のプレビューは @wiremark/core が描きます。",
  "site.formats.d2.purpose": "現代的な図: アーキテクチャ、シーケンス、クラス、SQL",
  "site.formats.d2.features": "編集、オフラインプレビュー、選んだ言語のサンプル",
  "site.formats.d2.summary":
    "アーキテクチャ、シーケンス、クラス、SQL のための現代的な図の言語です。オフラインプレビューは @d2lang/d2 がコンパイルします。",
  "site.formats.structurizr.purpose": "コードとしての C4 アーキテクチャ: コンテキスト、コンテナ、コンポーネント、配置",
  "site.formats.structurizr.features": "編集、オフラインの C4 プレビュー、選んだ言語のサンプル",
  "site.formats.structurizr.summary":
    "コードとしての C4 アーキテクチャです。全体像、コンテキスト、コンテナ、コンポーネント、配置です。エディタは Structurizr DSL を保ち、ビューは PlantUML の C4 で描きます。",

  "site.audience.title": "エンジニアリングチーム全体を速くする",
  "site.audience.architect.title": "🏛 ソフトウェアアーキテクト",
  "site.audience.architect.item1": "AI で C4 モデルと概念図をすばやくスケッチします。",
  "site.audience.architect.item2": "会社の文書を 1 つの標準にそろえます。",
  "site.audience.dev.title": "👨‍💻 開発者とチームリード",
  "site.audience.dev.item1": "タスクを設計しながらシーケンス図を作ります。",
  "site.audience.dev.item2": "図をコードとして扱い、Git に保存し、オフラインで編集します。",
  "site.audience.writer.title": "📝 テクニカルライターとビジネスアナリスト",
  "site.audience.writer.item1": "手順を追うウィザードで業務プロセスを記述します。",
  "site.audience.writer.item2":
    "プラットフォームごとに図を簡単に変換します（Notion/Confluence）。",

  "site.gettingStarted.title": "10 秒で開始 — 複雑なセットアップは不要",
  "site.gettingStarted.browser.title": "方法 A: ブラウザで",
  "site.gettingStarted.browser.text":
    "Code2Graph.ru を開くだけで、すぐに図の作成や変換を始められます。",
  "site.gettingStarted.pwa.title": "方法 B: PWA アプリとして",
  "site.gettingStarted.pwa.text":
    "ブラウザのアドレスバー、またはランディングページの「アプリをインストール」をクリックします。Code2Graph がデスクトップまたは電話のホーム画面に現れます。",

  "site.faq.title": "よくある質問",
  "site.faq.q1": "PWA とは何で、オフラインモードはどう動きますか？",
  "site.faq.a1":
    "プログレッシブウェブアプリは、ウェブサイトを端末上の普通のプログラムのように使えます。最初の読み込みのあと、アプリはローカルにキャッシュされ、インターネットなしで図の変換、編集、閲覧ができます。",
  "site.faq.q2": "AI 生成はオフラインで動きますか？",
  "site.faq.a2":
    "手作業の編集、形式の変換、手順を追うウィザード、保存はオフラインで動きます。AI のリクエストにはネットワーク接続が必要です。",
  "site.faq.q3": "データを失わずに PlantUML の図を Mermaid へ変換できますか？",
  "site.faq.a3":
    "はい。組み込みの変換が構文とノードを移し、元の図の論理を保ちます。",
  "site.faq.q4": "図を Code2Graph に保存するのは安全ですか？",
  "site.faq.a4":
    "はい。図はブラウザ / PWA アプリのローカルに保存され、アカウントがあれば非公開のクラウドに安全に保存されます。",

  "site.finalCta.title": "コードで図を描くための万能ツール",
  "site.finalCta.text":
    "AI で生成し、編集し、変換し、PlantUML、Mermaid、GraphML の図を 1 か所に保存します。どの端末でも、今すぐ使えます。",
  "site.finalCta.primary": "Code2Graph を開く",
  "site.finalCta.secondary": "📲 PWA をインストール",

  "site.featureOffline": "オフラインと file:// で動作",
  "site.featureFormats": "PlantUML · Mermaid · GraphML",
  "site.featureAi": "AI による図の生成と編集",
  "site.featureLibrary": "クラウドの図ライブラリ",
  "site.featureLlmLocal": "BYOK の LLM キーはブラウザに残ります",
  "site.loginTitle": "サインイン",
  "site.loginSubtitle": "個人アカウントとクラウドライブラリ",
  "site.registerTitle": "登録",
  "site.registerSubtitle": "Code2Graph サーバーにアカウントを作成",
  "site.accountTitle": "アカウント",
  "site.staticModeTitle": "ローカル版",
  "site.staticModeText":
    "このビルドはサーバーもデータベースもなく動作し、図はブラウザに残ります。サインインとクラウドライブラリはサーバー版で利用できます。",
  "site.username": "ユーザー名",
  "site.password": "パスワード",
  "site.passwordConfirm": "パスワードの確認",
  "site.rememberMe": "ログイン状態を保持",
  "site.loginSubmit": "サインイン",
  "site.registerSubmit": "アカウントを作成",
  "site.logout": "サインアウト",
  "site.openEditor": "エディタを開く",
  "site.backHome": "ホームに戻る",
  "site.mcp.title": "エージェント向け MCP",
  "site.mcp.connected": "接続済み",
  "site.mcp.disconnected": "未接続",
  "site.mcp.lead":
    "エージェントが言葉で図を説明します。Code2Graph が言語を選び、PlantUML、Mermaid、GraphML、WireMark、D2、Structurizr のソースと画像を返します。",
  "site.mcp.pointPlan": "plan_diagram が言語と図の種類を選びます。",
  "site.mcp.pointGenerate": "generate_diagram が図のソースと画像を返します。",
  "site.mcp.exampleCaption":
    "generate_diagram の結果は、エディタで開けるソースと、描画された図の画像です。",
  "site.mcp.exampleSource": "ソース",
  "site.mcp.exampleImage": "画像",
  "site.mcp.pointLanguages": "エディタとウィザードと同じ 6 つの言語です。",
  "site.mcp.openPage": "MCP の接続方法",
  "site.mcp.pageTitle": "Code2Graph MCP",
  "site.mcp.summary":
    "MCP サーバーは、Cursor などのエージェントが Code2Graph に図を依頼できるようにします。依頼から言語を選び、ソースと図の画像を返します。",
  "site.mcp.toolsTitle": "ツール",
  "site.mcp.toolList": "サイト上の言語と、それぞれが受け付ける図の種類です。",
  "site.mcp.toolPlan": "文に対する言語と種類です。ソースは含みません。",
  "site.mcp.toolGenerate":
    "図のソースと画像です。CODE2GRAPH_API_URL があるときはソースはサーバーから来ます。なければ同じひな形をローカルで作ります。画像は別のブロックです。Kroki が PlantUML、D2、Structurizr を描き、mermaid.ink が Mermaid を描き、GraphML と WireMark はローカルで描きます。",
  "site.mcp.connectTitle": "Cursor で接続",
  "site.mcp.connectText":
    "このリポジトリのチェックアウトからスクリプトを実行します。パスは自分のチェックアウトに置き換えてください。ローカルで生成するなら URL は空のまま、サーバー版を指すこともできます。",
  "site.mcp.source": "リポジトリ内の MCP パッケージ",
  "site.mcp.apiTitle": "サーバー API",
  "site.mcp.apiText":
    "サーバー版はこれらのルートを公開します。AGENT_API_TOKEN が設定されているときは、CODE2GRAPH_API_TOKEN と同じ値で Authorization: Bearer を送ってください。",
  "site.mcp.apiFormats": "言語と種類",
  "site.mcp.apiPlan": "言語を選ぶ",
  "site.mcp.apiScaffold": "言語、種類、ソース",
  "site.mcp.staticNote":
    "GitHub Pages は静的なエディタで、/api/agent は提供しません。API はサーバー版で動きます。例: www.code2graph.ru。",
  "site.noAccount": "アカウントがありませんか？",
  "site.hasAccount": "既にアカウントがありますか？",
  "site.role": "役割",
  "site.loginError": "ユーザー名またはパスワードが無効です",
  "site.registerError": "登録に失敗しました",
  "site.registerDisabled": "管理者によって登録は無効です",
  "site.registerStatusError":
    "サーバーの状態を確認できませんでした。接続を確認して、もう一度試してください。",
  "site.registerMismatch": "パスワードが一致しません",
  "site.registerRequired": "すべての欄を入力してください",
  "site.welcomeUser": "{username} としてサインイン中",
  "site.versionHint": "サイトのバージョン — 更新またはページの再読み込み後に比べます",
  "site.footer.links": "プロジェクトのリンク",
  "site.license.title": "ライセンス",
  "site.license.summary":
    "Prosperity Public License 3.0.0 のソース公開です。非商用は無料です。",
  "site.license.commercial":
    "商用は 30 日間の試用は無料で、その後は有料ライセンスが必要です。",
  "site.license.read": "ライセンスを読む",
  "site.license.commercialLink": "商用ライセンス",
} as const satisfies LocaleMessages;
