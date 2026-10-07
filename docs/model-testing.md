# Fantasy statistics and model testing

Run the focused automated suite with `npm test`.

## Current automated coverage

- Unit tests cover the three-game-versus-three-game scoring comparison, its 0.5-point practical threshold, and the six-scored-game minimum. Below that minimum, the UI reports limited data instead of inventing a direction.
- Model tests exercise the latest-season holdout path, the trailing-three-game baseline, reported sample counts, and cases where there is not enough prior-season data to validate a model.

## Interpretation rules

- A colored trend is directional, not proof of statistical significance: yellow means the recent three-game average rose by at least 0.5 points; orange means it fell by at least 0.5; smaller movement is steady. Injury exposure and unmet roster depth are red.
- Six scored games are a minimum for describing movement, not a claim that the change is statistically significant.
- The current model holdout is one season. Its player-week rows are clustered by player and are not independent observations, so an MAE difference alone must not be presented as a proven predictive edge.
- A model should only be described as reliably better than a baseline after out-of-time evaluation across multiple seasons and a player-clustered paired uncertainty interval for the difference in absolute errors. If that interval includes zero, report the comparison as inconclusive.

## Next test layers

1. **Integration:** fixture player profiles through ingestion, scoring-format conversion, lineup selection, model forecast, and rendered roster summary; assert missing weeks and injury data remain visible as missing or flagged rather than silently imputed.
2. **Regression:** preserve versioned, representative historical fixtures and expected output shapes; compare forecasts to the same trailing-average baseline and flag changes in MAE, coverage, or position-level error.
3. **Model evaluation:** use rolling season cutoffs, never random player-week splits; report sample counts and coverage by position and role; bootstrap paired errors by player (not individual player-week) before interpreting uncertainty.
4. **Data quality:** test duplicate player-weeks, season/week ordering, missing scoring values, impossible negative opportunities, and late corrections so data defects cannot masquerade as player trends.

Do not tune thresholds or claim better accuracy from the same holdout data used to choose the model.
