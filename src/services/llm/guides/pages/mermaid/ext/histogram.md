[Mermaid types](../index.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# histogram

Counts or density of numeric observations, with a distribution curve. Aliases: hist, dist. This is not a categorical `series` chart.

```
histogram
title Задержка
x "мс" 0 --> 200
y "число"
bins auto
scale count
gap 0
labels above fontcolor auto
missing drop
errors drop
outliers iqr 1.5 drop
ci 0.95
stats mean median sd var ci
grid
axis y on
colors s1=#0969da mean=#cf222e median=#8250df ci=#d0d7de
series Наблюдения : 12, 18, , 22, na, oops, 30
fit normal
curve weibull shape=1.6 scale=28 "эталон" color=#8250df
```

`series Name : v1, v2, …` is one sample. An empty cell, na, n/a, null, none, nan, -, — or . is missing. Several series share the bins and sit side by side.

Bins: `bins auto` (Freedman–Diaconis, Sturges when the IQR is 0), `bins N`, `binwidth W`, or abutting `bins 0 --> 10, 10 --> 25, 25 --> 80`. A boundary belongs to the bin on the right. The last interval is closed. Do not combine `bins` with `binwidth`.

`scale count` draws the count and places the curve at pdf(x) * n * width of the bin that contains x. `scale density` draws count/(n*width) and the pdf. Use density when the bins are unequal.

`fit normal` estimates the last series, or the quoted series name. `curve` draws the given parameters and ignores the data. Families: normal, lognormal, exponential, uniform, gamma, weibull. A fitted normal sigma uses divisor n. The summary sd uses n−1.

`stats` defaults to mean, median, sd, var, and ci. Also min, max, q1, q3, iqr, skew, kurtosis, `stats all`, and `stats off`. `ci 0.95` is the Student-t interval of the mean.

Gap, labels, colors, mono, rotate 90, fontsize, ratio, grid, axis visibility, and `line N "label"` work as on a series chart. There is no axis break, second axis, stack, area, or CAGR. The y axis starts at 0 unless `y` sets a range.
