# Comment-Section Narrative Model

## Purpose
Comments can affect both users and downstream search/recommendation interpretations.

## Model
A content item has comment narrative vector:

\[
n_i = \frac{1}{C_i}\sum_{j=1}^{C_i} Embedding(comment_j)
\]

A seeded comment cluster shifts the narrative:

\[
\tilde{n}_i = \frac{C_i n_i + M m}{C_i+M}
\]

where \(m\) is the seeded-message vector and \(M\) is seeded comment count.

## Effects
- Users interpret the comment section as social context.
- Search/recommendation systems may use comments as content information.
- Suggested search terms or discourse labels may be influenced by repeated comment themes.

## Detection
Look for early generic comments, repeated semantic frames, synchronized commenters, and low-history accounts.
