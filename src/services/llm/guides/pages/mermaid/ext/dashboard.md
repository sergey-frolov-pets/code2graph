[Mermaid types](../index.md) · [Shared Ext rules](./shared.md)

Reply with diagram source for the editor only. Do not return an image or an external renderer URL.

# dashboard

A canvas that places one library diagram in each marked zone.

```
dashboard
size 1280x720
refresh 5m
zone 0 0 0.5 0.5 diagram "revenue"
zone 0.5 0 0.5 1 diagram "load"
```

`size` is the world in pixels. `refresh` is `30s`, `5m`, or `1h`. Each `zone` is `x y w h` as fractions of the world plus one diagram id from the same library.
