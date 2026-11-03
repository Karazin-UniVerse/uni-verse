# Opportunity tags

Tags are normalized by trimming, collapsing whitespace and lowercasing. Duplicate
names are removed. Commas are allowed inside a tag name.

## Catalog filter

`GET /opportunities` accepts one complete tag name per `tags` query parameter:

```text
/opportunities?tags=research%2Cdesign&tags=react
```

This selects the names `research,design` and `react`. A single parameter such as
`tags=research%2Cdesign` denotes one tag, not two. The frontend API client emits
repeated parameters; callers must not join tag names with commas. This replaces
the ambiguous comma-separated wire format. The request type remains `string[]`,
and matching semantics are unchanged.

Create and update requests accept a JSON `tags` array of strings. Mixed-type
arrays return HTTP 400 instead of silently dropping malformed entries. Valid
string normalization, including empty-string cleanup, is unchanged.

## IME input

TagInput uses native composition state and a 50 ms event-timestamp window after
`compositionend` to avoid treating IME confirmation as tag creation. The absolute
timestamp difference covers Safari's inverted event delivery order without the
deprecated `KeyboardEvent.keyCode` API. An intentional Enter outside that window
adds the tag normally.

Reference: [Chrome's IME-safe Enter handling](https://developer.chrome.com/docs/modern-web-guidance/guides/forms/ime-safe-enter-submit#strategy_2_the_eventtimestamp_window_workaround_alternative).
