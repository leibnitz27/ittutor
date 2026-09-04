# Italian hetero-gender plurals

These nouns are masculine in the singular but have **two** plural forms with different genders and different meanings. The data model cannot represent both, so they are excluded from the corpus.

| Singular (m) | Plural — collective/body (f) | Plural — individual/other (m) |
|---|---|---|
| il braccio | le braccia (arms of the body) | i bracci (arms of a cross, crane) |
| il ciglio (eyelash/edge) | le ciglia (eyelashes) | i cigli (road edges) |
| il dito | le dita (fingers as a set) | i diti (individual fingers) |
| il ginocchio | le ginocchia (knees together) | i ginocchi (individual knees) |
| il grido | le grida (cries from a crowd) | i gridi (individual shouts) |
| il labbro | le labbra (lips as a pair) | i labbri (individual lips, jar lips) |
| il muro | le mura (enclosing walls, ramparts) | i muri (separate wall objects) |
| l'osso | le ossa (bones as a skeleton) | gli ossi (individual bones) |
| l'uovo | le uova (eggs collectively) | gli uovi (rare/archaic) |
| il sopracciglio | le sopracciglia (eyebrows as a pair) | i sopraccigli (individual) |

## Pattern

The feminine plural is typically the **collective or body-as-a-whole** sense; the masculine plural is the **individual or metaphorical** sense. This reflects a survival of Latin neuter plurals (which ended in -a and were reanalysed as Italian feminine).

## Corpus handling

- `muro` was replaced with `parete` (f, le pareti — interior wall, unambiguous).
- The others are simply absent from the corpus and should not be added unless the data model is extended to support multiple plural forms.
