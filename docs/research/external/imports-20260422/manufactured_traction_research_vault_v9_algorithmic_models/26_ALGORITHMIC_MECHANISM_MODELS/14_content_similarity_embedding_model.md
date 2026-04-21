# Content Similarity and Embedding Model

## Purpose
Many campaigns vary wording while preserving the same message. Exact matching misses this.

Represent content as embeddings:

\[
z_i = Embedding(text_i, image_i, audio_i, video_i)
\]

Similarity between two posts:

\[
\operatorname{sim}(i,j)=\frac{z_i\cdot z_j}{\|z_i\|\|z_j\|}
\]

Flag clusters where:

\[
\operatorname{sim}(i,j) \ge \tau
\]

and timing/account patterns also align.

## TikTok/video-first adaptation
Video-first detection may use caption similarity, hashtag sequence overlap, media reuse, audio reuse, voiceover similarity, visual layout similarity, or repeated external domains.

## Caution
Memes and trends naturally reuse templates. Similarity alone is not evidence of deception.
