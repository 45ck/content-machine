# **Evaluation and Testing**

## **Minimum viable experiment**

Run 30 clips in one format, such as dev explainers.

For each idea, create three variants:

```text
A: human/AI authority voice + low pulse
B: same voice + no music + light SFX
C: trend/template audio + captions
```

Track:

```text
1s retention
3s retention
6s retention
completion
average watch percentage
replay
share rate
save rate
comment rate
follow rate
```

## **Audio lift**

```math
AudioLift_variant = Reward_variant - Reward_baseline
```

## **Diagnostics**

| Metric failure | Interpretation | Intervention |
|---|---|---|
| low 1s retention | no sonic hook | add first sound before 500ms |
| low 3s retention | weak proposition | sharper first line or trend cue |
| low completion | pacing drag | add beat switch or trim pauses |
| low replay | loop weak | reconnect ending to beginning |
| low saves | information unclear | reduce music, improve captions |
| low shares | arousal/social trigger weak | add surprise, identity cue, or template slot |
| negative AI voice comments | uncanny prosody | use human take or regenerate with stronger direction |

## **Experiment decision rule**

```text
Keep top 2 audio strategies.
Retire bottom 1.
Mutate winners into 3 new variants.
Repeat.
```
