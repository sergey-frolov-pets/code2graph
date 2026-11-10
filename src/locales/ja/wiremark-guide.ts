import type { LocaleMessages } from "../types";

export const wiremarkGuideMessages = {
  "site.wiremark.typesLead":
    "WireMark ガイドにある画面の種類です。1 つのフレーム、アプリの枠、フォーム、設定リスト、カード、フロー、共通のクロームです。",
  "site.wiremark.keywordsLead":
    "WireMark ガイドのキーワードです。フレームのルート、レイアウト、テキスト、コンポーネント、行のルールです。コンポーネント一覧とアイコンギャラリーはドキュメントにあります。",
  "site.wiremark.docsComponents": "コンポーネントリファレンス",
  "site.wiremark.docsIcons": "アイコンギャラリー",

  "site.wiremark.type.login.title": "ログイン画面",
  "site.wiremark.type.login.text":
    "電話サイズのフレームです。タブ、アイコン付きフィールド、情報アラート、to=#id で別フレームを開く塗りつぶしの全幅ボタンがあります。",
  "site.wiremark.type.dashboard.title": "アプリの枠",
  "site.wiremark.type.dashboard.text":
    "横長のフレームです。メニューバー、密度の高いアプリバー、固定ドロワー、チャートカード、スクロールバー付きの表があります。",
  "site.wiremark.type.form.title": "フォーム",
  "site.wiremark.type.form.text":
    "縦長のフレームです。ステップ、必須フィールド、value=、複数行エリア、セレクト、スライダー、評価、カレンダー、同意のチェックボックスがあります。",
  "site.wiremark.type.settings.title": "設定リスト",
  "site.wiremark.type.settings.text":
    "アプリバー、エラーアラート、to=#id 付きの行リスト、アコーディオン、下部ナビゲーション、確認ダイアログがあります。",
  "site.wiremark.type.product.title": "商品カード",
  "site.wiremark.type.product.text":
    "幅の広いカードです。Img は ratio=16:9 を使い、その後にチップ、地図、仕様表、ボタングループ付きの CardActions があります。",
  "site.wiremark.type.flow.title": "画面フロー",
  "site.wiremark.type.flow.text":
    "Flow LR が 2 つの画面をつなぎます。隠したシェル（visible=false）を background=#id で取り込み、内容は Anchor #content に置きます。Icons で独自の印を宣言します。",
  "site.wiremark.type.chrome.title": "共通のクローム",
  "site.wiremark.type.chrome.text":
    "visible=false のシェルは単体では描かれません。ほかのフレームが background=#id で取り込み、内容を anchor=#id の Anchor 領域に置きます。",

  "site.wiremark.group.frame": "フレームとフロー",
  "site.wiremark.group.layout": "レイアウト",
  "site.wiremark.group.text": "テキストと埋め草",
  "site.wiremark.group.ui": "画面コンポーネント",
  "site.wiremark.group.syntax": "構文",

  "site.wiremark.keyword.wireframe":
    "画面のルートです。その下にインデントしたすべてがその画面に載ります。ほかのフレームからここへリンクできるよう #id を付け、サイズのプリセットか w= と h= の両方を指定します。",
  "site.wiremark.keyword.frameId":
    "Wireframe ではフレームに、Anchor では領域に名前を付けます。to= と background=#id はフレームだけに一致します。anchor= は領域だけに一致します。",
  "site.wiremark.keyword.mobile": "Wireframe ルートの、電話幅のサイズプリセットです。",
  "site.wiremark.keyword.landscape":
    "横長のサイズプリセットです。アプリの枠やダッシュボードに使います。",
  "site.wiremark.keyword.portrait": "Wireframe ルートの、縦長のサイズプリセットです。",
  "site.wiremark.keyword.frameSize":
    "カスタムのフレームサイズです。Wireframe ルートでは w= と h= の両方を指定します。anchor= でフレームの大きさを決めるときは、プリセットは付けません。",
  "site.wiremark.keyword.visible":
    "visible=false はフロー図からフレームを隠し、それでも background= の対象にできます。既定は表示です。",
  "site.wiremark.keyword.frameBackground":
    "Wireframe では background=#id が別のフレームを下に描きます。通常の要素では background= は網掛けで、hatch、crosshatch、none です。",
  "site.wiremark.keyword.anchor":
    "シェルの中の見えない領域です。サイズがなければ残りの空間を埋めます。前面のフレームが対象にできるよう #id を付けます。",
  "site.wiremark.keyword.anchorAt":
    "前面のフレームを、背景の領域の中に置きます。別名は at= です。そのフレームにプリセットや w=/h= は付けません。アンカーが優先されます。",
  "site.wiremark.keyword.flow":
    "フレームの外にある最上位の指示です。Flow TD は上から下で、既定です。Flow LR は左から右です。",
  "site.wiremark.keyword.to":
    "どの要素でも to=#id がその要素をフレームへつなぎます。ナビゲーションのグラフはこれらのリンクから作られます。別名は href= です。対象はフレームだけです。",
  "site.wiremark.keyword.stack":
    "子を 1 つの軸に並べます。既定の方向は column です。gap=（spacing= の別名）が子の間隔です。Stack だけでは何も描きません。",
  "site.wiremark.keyword.column":
    "キーなしの Stack の方向です。子は上から下に積まれます。column-reverse はその順を反転します。",
  "site.wiremark.keyword.row":
    "キーなしの Stack の方向です。子は左から右へ並びます。row-reverse はその順を反転します。",
  "site.wiremark.keyword.gap":
    "spacing= の別名です。子の間隔を間隔の単位で指定します。gap=2 と書きます。引用符付きの数値はエラーです。",
  "site.wiremark.keyword.box":
    "汎用のコンテナです。キーなしのトークンは幅、次に高さです: Box 240px *。outline（solid、dashed、dotted）と elevation= が見えるパネルを描きます。",
  "site.wiremark.keyword.grid":
    "均一なグリッドです。子はセルへ流れ込みます。cols= が列数、gap= が間隔です。",
  "site.wiremark.keyword.cols": "Grid の列数です。キー付きだけです: cols=3。",
  "site.wiremark.keyword.spacer":
    "スタックの方向に沿って兄弟を押し広げる、伸縮する間隔です。",
  "site.wiremark.keyword.divider":
    "プロパティのない水平線です。Stack では、キーなしの divider が各間隔に線を描きます。",
  "site.wiremark.keyword.sizing":
    "位置で指定するサイズです。幅、次に高さです。240px はピクセル、30% は空き領域の割合、* はその軸を埋め、裸の数値はフレックスの重みです。キー付きの width= は拒否されます。",
  "site.wiremark.keyword.typography":
    "テキストの葉です。引用符付きの文字列が画面上の文言です。テキストがなければ、Typography だけが埋め草を 1 行描きます。",
  "site.wiremark.keyword.typeVariant":
    "キーなしのテキストの役割です。h1–h6、subtitle1、subtitle2、body1（既定）、body2、caption、overline、button です。見出し h1–h6 は太字です。caption は控えめな色です。",
  "site.wiremark.keyword.textField":
    "テキスト入力です。引用符付きの文字列がラベルです。バリアントは outlined（既定）、filled、standard です。",
  "site.wiremark.keyword.fillerAmount":
    "本当のラベルがないときに描くプレースホルダーの量です。~3 はおよそ 3 行、~5w はおよそ 5 語、~2l はおよそ 2 行です。_、__、___ は短、中、長です。",
  "site.wiremark.keyword.fillerStyle":
    "プレースホルダー文字の見た目です。squiggle（既定）、lorem、blocks です。Wireframe ルートか、1 つのテキスト要素に指定します。色は変わりません。",
  "site.wiremark.keyword.required":
    "真偽のフラグです。TextField ではラベルの後に * を付けます。",
  "site.wiremark.keyword.value":
    "フィールド内のキー付きテキストです。裸の引用符文字列はラベルなので、内容は value=\"...\" と書きます。",
  "site.wiremark.keyword.multiline":
    "真偽のフラグです。TextField をテキストエリアに広げます。rows=4 が高さです。rows がなければ、複数行フィールドは 3 行の高さです。",
  "site.wiremark.keyword.noWrap":
    "Typography の真偽フラグです。行は 1 行のまま、はみ出しは省略記号で終わります。",
  "site.wiremark.keyword.button":
    "操作です。引用符付きの文字列がラベルです。Button だけだと「Button」と読まれます。バリアントは text（既定）、outlined、contained です。",
  "site.wiremark.keyword.contained":
    "キーなしの Button バリアントです。塗りつぶしの網掛けで、主操作です。primary というキーワードはありません。",
  "site.wiremark.keyword.outlined":
    "キーなしのバリアントです。Button では塗りなしの枠です。TextField では outlined が既定の外枠です。",
  "site.wiremark.keyword.link":
    "行内のテキストリンクです。引用符付きの文字列がラベルです。to=#id でフレームへ移動します。",
  "site.wiremark.keyword.list":
    "ListItem の行を縦に積んだものです。dense は行を詰めます。subheader= は小さな見出しを足します。",
  "site.wiremark.keyword.listItem":
    "1 行です。引用符付きの文字列がラベルです。to=#id でその行がリンクになります。ListItem は子を取れません。",
  "site.wiremark.keyword.appBar":
    "画面上部を横切るバーです。通常は Toolbar を包みます。",
  "site.wiremark.keyword.toolbar":
    "AppBar の中の横一列です。タイトル、アイコン、操作を置きます。",
  "site.wiremark.keyword.icon":
    "Material のグリフ 1 つです。Icon Search と Icon \"Search\" は同じ名前です。未知の名前はプレースホルダーを描き、警告します。fontSize= または size= は small、medium、large です。",
  "site.wiremark.keyword.startIcon":
    "ラベルの前に描く、キー付きのアイコン名です: startIcon=Email。endIcon= はラベルの後に描きます。プロパティ名を引用符で囲まないでください。",
  "site.wiremark.keyword.iconsBlock":
    "フレームの中ではなく、フレームの隣にある最上位の Icons ブロックです。各項目は名前と SVG のパスデータです。文書のアイコンは、同じ名前の組み込みアイコンを上書きします。",
  "site.wiremark.keyword.card":
    "面です。CardContent のない子が本体です。to=#id でカード全体がリンクになります。",
  "site.wiremark.keyword.cardContent":
    "ヘッダー、メディア、操作が分かれているときの、Card のテキスト領域です。",
  "site.wiremark.keyword.cardActions": "Card 下部のボタン列です。",
  "site.wiremark.keyword.img":
    "画像の代わりの、交差したプレースホルダーです。ratio=16:9 が縦横比です。src= はメタデータです。スケッチはそれでもプレースホルダーを描きます。",
  "site.wiremark.keyword.control":
    "チェックボックス、ラジオ、スイッチです。Control checkbox が既定です。checked でオンになります。Control radio と Control switch は別のグリフを選びます。",
  "site.wiremark.keyword.indent":
    "インデントが包含です。1 レベルにつきスペース 2 つで、スペースだけです。より深い行が子です。タブはエラーです。",
  "site.wiremark.keyword.quotes":
    "引用符付きの文字列は描かれるテキストで、引用符は必須です。裸の語は設定です。列挙、フラグ、数値、サイズ、アイコン名です。列挙や数値を引用符で囲まないでください。",
  "site.wiremark.keyword.keyed":
    "key=value は名前付きプロパティです。キーなしの値はキーを省き、型で選ばれます。順序は自由です。ただしサイズは幅、次に高さです。",
  "site.wiremark.keyword.comment":
    "// コメントは行末まで続きます。# はアンカーの開始なので、コメントではありません。",
} as const satisfies LocaleMessages;
