# Entropy and Diversity Metrics

Entropy measures diversity. Low diversity can indicate templating or centralized control.

## Shannon entropy

For a distribution of categories:

`H = -Σ p_i log(p_i)`

Where `p_i` is the share of observations in category `i`.

## Examples

### Caption entropy

Low caption entropy means many posts use the same or nearly same language.

### Hashtag entropy

Low hashtag entropy means accounts use the same tag set repeatedly.

### Source entropy

Low source entropy means many accounts point to the same URLs, domains, or assets.

### Audience entropy

Low geography/device/referrer entropy can indicate fake traffic or platform exploitation.

## Normalized entropy

`H_norm = H / log(k)`

Where `k` is number of possible categories.

Values near 0 mean low diversity. Values near 1 mean high diversity.

## Interpretation

Low entropy is not automatically bad. Official campaigns may use consistent language. The key question is whether the consistency is disclosed, expected, and proportionate.
