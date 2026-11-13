import type { LocaleMessages } from "../types";

export const tablePasteMessages = {
  "editor.pasteTable": "クリップボードから表を貼り付け",
  "editor.pasteTableHistory": "表を貼り付け",
  "tablePaste.modalTitle": "クリップボードから表を貼り付けできません",
  "tablePaste.reasonLabel": "問題の内容",
  "tablePaste.expectedLabel": "想定する表の形式（{type}）",
  "tablePaste.columnsLabel": "列:",
  "tablePaste.rulesLabel": "変換ルール:",
  "tablePaste.sampleLabel": "コピー用のサンプル表（Excel / Google スプレッドシート / TSV）:",
  "tablePaste.error.emptyClipboard":
    "クリップボードは空です。Excel または Google スプレッドシートからセル範囲をコピーするか、タブまたはセミコロン区切りの表をコピーしてください。",
  "tablePaste.error.clipboardReadFailed":
    "クリップボードを読めませんでした。ブラウザでクリップボードの許可を与えて、もう一度試してください。",
  "tablePaste.error.notATable":
    "クリップボードの内容は表ではありません（タブ、';'、'|' で区切られた列が少なくとも 2 つ必要です）。",
  "tablePaste.error.tooManyColumns":
    "列が多すぎます。クリップボードには {actual} 列ありますが、この図が想定するのは {expected} 列です。",
  "tablePaste.error.tooFewColumns":
    "列が少なすぎます。クリップボードには {actual} 列ありますが、この図が想定するのは {expected} 列です。",
  "tablePaste.error.tooFewColumnsMin":
    "列が少なすぎます。クリップボードには {actual} 列ありますが、少なくとも {min} 列必要です。",
  "tablePaste.error.tooFewRowsMin":
    "行が少なすぎます。クリップボードには {actual} 行ありますが、少なくとも {min} 行必要です。",
  "tablePaste.error.expectedColumnRange":
    "列数が無効です。クリップボードには {actual} 列ありますが、{min} 列から {max} 列の間である必要があります。",
  "tablePaste.error.waterfallColumns":
    "2 列必要です。テキストラベルの列と、数値の列（合計の '=' では空セル可）です。",
  "tablePaste.error.waterfallFirstMustBeNumber":
    "最初のデータ行（{row} 行目）には、空セルではなく開始の数値（'=数値'）が必要です。",
  "tablePaste.error.noNumericColumn":
    "どちらの列にも数値がありません。",
  "tablePaste.error.invalidNumberAtRow":
    "{row} 行目: 値 \"{value}\" は有効な数値ではありません。",
  "tablePaste.error.negativeNotAllowedAtRow":
    "{row} 行目: 負の値 \"{value}\" は円グラフでは使えません。",
  "tablePaste.error.noDataRows":
    "コピーした表にデータ行がありません。",
  "tablePaste.type.waterfall": "ウォーターフォール",
  "tablePaste.type.pie": "円グラフ",
  "tablePaste.type.heatmap": "ヒートマップ",
  "tablePaste.type.bubble": "バブルチャート",
  "tablePaste.type.ev": "アーンドバリュー (EV)",
  "tablePaste.type.boxplot": "箱ひげ図",
  "tablePaste.type.treemap": "ツリーマップ",
  "tablePaste.type.radar": "レーダーチャート",
  "tablePaste.type.voronoi": "ボロノイ図",
  "tablePaste.type.clustered": "系列チャート",
  "tablePaste.type.xychart": "XY チャート（棒 / 折れ線）",
  "tablePaste.type.quadrant": "四分円チャート",
  "tablePaste.type.sankey": "サンキーダイアグラム",
  "tablePaste.type.orgchart": "組織図",
  "tablePaste.type.gantt": "ガントチャート",
  "tablePaste.type.timeline": "タイムライン",
  "tablePaste.type.journey": "ユーザージャーニー",
  "tablePaste.type.packet": "パケットヘッダー",
  "tablePaste.type.wbs": "作業分解 (WBS)",
  "tablePaste.type.mindmap": "マインドマップ",
  "tablePaste.type.nwdiag": "ネットワーク図 (Nwdiag)",
  "tablePaste.type.wireframe": "WireMark の表",
  "tablePaste.expected.waterfall.columns":
    "順序はどちらでもよい 2 列: 「ラベル」と「値」（または「値」と「ラベル」）。",
  "tablePaste.expected.waterfall.rules":
    "最初の数値は開始の棒（=N）、正の数は増加（+N）、負の数は減少（-N）、空セル（または '='）は累計（= : ラベル）になります。",
  "tablePaste.expected.waterfall.headers": "ラベル|値",
  "tablePaste.expected.pie.columns":
    "順序はどちらでもよい 2 列: 「カテゴリ」と「0 以上の数値」。",
  "tablePaste.expected.pie.rules":
    "各行がスライスになります: \"カテゴリ\" : 値。",
  "tablePaste.expected.pie.headers": "カテゴリ|割合",
  "tablePaste.expected.heatmap.columns":
    "少なくとも 2×2 の行列です。先頭行は X の列見出し、先頭列は Y の行ラベル、内側のセルは数値（または空セル）です。",
  "tablePaste.expected.heatmap.rules":
    "スケールブロックの前に x と y の行を挿入します。スケールがなければ、最小値から最大値までの青から赤のスケールを追加します。空セルは null の枠になります。",
  "tablePaste.expected.heatmap.headers": "期間|月|火|水",
  "tablePaste.expected.bubble.columns":
    "4 列または 5 列: 「ラベル」、「X（数値）」、「Y（数値）」、「サイズ（数値）」、［「グループ（任意）」］。",
  "tablePaste.expected.bubble.rules":
    "各行がバブルの点になります: ラベル : x=..., y=..., size=..., group=...",
  "tablePaste.expected.bubble.headers": "製品|X|Y|サイズ|グループ",
  "tablePaste.expected.ev.columns":
    "4 列: 「期間（日）」、「PV（計画）」、「EV（出来高）」、「AC（実績）」（または 4 行: days、pv、ev、ac）。",
  "tablePaste.expected.ev.rules":
    "アーンドバリューチャート用に days、pv、ev、ac の系列を生成します。",
  "tablePaste.expected.ev.headers": "期間|PV|EV|AC",
  "tablePaste.expected.boxplot.columns":
    "6 列（「カテゴリ」、「最小」、「Q1」、「中央値」、「Q3」、「最大」）、または生の観測値を 4 列以上（「カテゴリ」、「標本 1」、「標本 2」、「標本 3」…）。",
  "tablePaste.expected.boxplot.rules":
    "五数要約では min=...、q1=...、median=...、q3=...、max=... を、生の標本では values=... を生成します。",
  "tablePaste.expected.boxplot.headers": "カテゴリ|最小|Q1|中央値|Q3|最大",
  "tablePaste.expected.treemap.columns":
    "2 列から 4 列: 「項目 | 重み」または「グループ | 項目 | 重み [| 色]」。",
  "tablePaste.expected.treemap.rules":
    "階層ブロック「グループ / 項目 : 重み」を生成します（重みは 0 より大きい必要があります）。",
  "tablePaste.expected.treemap.headers": "グループ|項目|重み",
  "tablePaste.expected.radar.columns":
    "少なくとも 4 列の行列です。先頭行は軸名（少なくとも 3 軸）、先頭列は系列名、内側のセルは数値です。",
  "tablePaste.expected.radar.rules":
    "見出し行から axes 指示を作り、「series 名前 : v1, v2, ...」の行を生成します。",
  "tablePaste.expected.radar.headers": "系列|速度|信頼性|使いやすさ|安全性",
  "tablePaste.expected.voronoi.columns":
    "3 列から 5 列: 「地点」、「X（数値）」、「Y（数値）」、［「グループ」］、［「色」］。",
  "tablePaste.expected.voronoi.rules":
    "各行がボロノイの地点になります: 地点 : x=..., y=..., group=...",
  "tablePaste.expected.voronoi.headers": "地点|X|Y|グループ",
  "tablePaste.expected.clustered.columns":
    "少なくとも 2×2 の行列です。先頭列はカテゴリ、先頭行は系列名です（見出しが「系列」で始まるときは転置）。",
  "tablePaste.expected.clustered.rules":
    "categories と series の行を生成し、rotate 90、invert y、色の指示は維持します。",
  "tablePaste.expected.clustered.headers": "カテゴリ|北|南|輸出",
  "tablePaste.expected.xychart.columns":
    "1 列以上です。1 列は棒 [値 1, ..., 値 n] の数値です。2 列は「X カテゴリ」と「棒の値」です。3 列以上は「X カテゴリ」に加え、残りの各列が棒の系列です。",
  "tablePaste.expected.xychart.rules":
    "1 列は既存の bar [値] 行を置き換えます。2 列以上は x-axis とすべての bar 行を置き換え、値の列ごとに bar [...] 系列を 1 つ作ります。チャートに y-axis がまだなければ、y-axis \"\" min --> max を追加します。",
  "tablePaste.expected.xychart.headers": "月|計画|実績|予測",
  "tablePaste.expected.quadrant.columns":
    "3 列: 「点のラベル」、「X（0..1 または 0..100%）」、「Y（0..1 または 0..100%）」。",
  "tablePaste.expected.quadrant.rules":
    "1 より大きい座標は、百分率（0..100）から [0..1] へ自動で正規化します。",
  "tablePaste.expected.quadrant.headers": "項目|X|Y",
  "tablePaste.expected.sankey.columns":
    "3 列: 「ソース」、「ターゲット」、「流量（数値）」。",
  "tablePaste.expected.sankey.rules":
    "各行がフローの行になります: ソース,ターゲット,値。",
  "tablePaste.expected.sankey.headers": "ソース|ターゲット|流量",
  "tablePaste.expected.orgchart.columns":
    "2 列または 3 列: 「上司」、「直属」、「エッジのスタイル（点線）または役職」。",
  "tablePaste.expected.orgchart.rules":
    "組織図のノードと、実線（->）または点線（-.->）の報告線を生成します。",
  "tablePaste.expected.orgchart.headers": "上司|部下|リンク",
  "tablePaste.expected.gantt.columns":
    "2 列から 4 列: 「タスク」、「開始日または期間」、［「期間（5d）」］、［「セクション」］。",
  "tablePaste.expected.gantt.rules":
    "ガントのタスク行を生成します（Mermaid ではセクションごとにまとめます）。",
  "tablePaste.expected.gantt.headers": "タスク|開始|期間|セクション",
  "tablePaste.expected.timeline.columns":
    "2 列または 3 列: 「期間 / 日付」、「イベント」、［「セクション（任意）」］。",
  "tablePaste.expected.timeline.rules":
    "各行がタイムラインの項目「期間 : イベント」になります。",
  "tablePaste.expected.timeline.headers": "期間|イベント|セクション",
  "tablePaste.expected.journey.columns":
    "2 列から 4 列: 「ステップ」、「スコア（1–5）」、［「アクター」］、［「セクション」］。",
  "tablePaste.expected.journey.rules":
    "ユーザージャーニーのステップ「ステップ: スコア: アクター」を生成します。",
  "tablePaste.expected.journey.headers": "ステップ|スコア|アクター|セクション",
  "tablePaste.expected.packet.columns":
    "順序はどちらでもよい 2 列: 「ビット範囲（0-15）またはビット長（16）」と「フィールド名」。",
  "tablePaste.expected.packet.rules":
    "パケットフィールド「0-15: \"フィールド\"」を生成します（ビット長は自動で範囲に積み上げます）。",
  "tablePaste.expected.packet.headers": "ビット|フィールド",
  "tablePaste.expected.wbs.columns":
    "階層レベルを表す 2 列以上: 「レベル 1（ルート）」、「レベル 2」、「レベル 3」など。",
  "tablePaste.expected.wbs.rules":
    "WBS の木（*、**、***）を作り、同じ親セルは自動でまとめます。",
  "tablePaste.expected.wbs.headers": "レベル 1|レベル 2|レベル 3",
  "tablePaste.expected.mindmap.columns":
    "木の深さを表す 2 列以上: 「ルート」、「分岐」、「下位の分岐」など。",
  "tablePaste.expected.mindmap.rules":
    "同じ親をまとめてマインドマップの木を作ります。貼り付けたノードはマップの全ノードを置き換えます。凡例、title、header、footer、caption、style、コメントは残します。",
  "tablePaste.expected.mindmap.headers": "ルート|分岐|葉",
  "tablePaste.expected.nwdiag.columns":
    "2 列または 3 列: 「ノード」、「IP アドレス」、［「ネットワーク（任意）」］。",
  "tablePaste.expected.nwdiag.rules":
    "ノードをネットワークごとに network { node [address = \"...\"] } ブロックへまとめます。",
  "tablePaste.expected.nwdiag.headers": "ノード|IP アドレス|ネットワーク",
  "tablePaste.expected.wireframe.columns":
    "少なくとも 2 列の任意の表です（先頭行が見出し、残りの行が本体です）。",
  "tablePaste.expected.wireframe.rules":
    "TableHead と TableBody を持つ WireMark の Table コンポーネントを生成します（数値の列は右揃え）。",
  "tablePaste.expected.wireframe.headers": "名前|著者|状態|閲覧数",
  "tablePaste.type.powermap": "パワーマップ",
  "tablePaste.expected.powermap.columns": "名前、役職、上司、役割、影響力、行動の必要性、態度、相手、関係（solid、dotted、または関係名）。",
  "tablePaste.expected.powermap.rules": "各行が一人です。solid と dotted は報告線です。それ以外の名前は影響の矢印です。",
  "tablePaste.expected.powermap.headers": "名前|役職|上司|役割|影響力|行動|態度|相手|関係",

} as const satisfies LocaleMessages;
