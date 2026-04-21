# Algorithmic Mechanism Models

This folder strengthens the project from descriptive evidence into **mechanistic models**. The aim is not to reproduce any private platform algorithm. It is to model the public structure that many recommender, ranking, search, review, and advertising systems share:

1. systems use **proxy signals** such as engagement, watch time, ratings, reviews, clicks, installs, links, saves, or revenue;
2. proxy signals influence **candidate selection**, **ranking**, **recommendation**, **trust**, or **budget allocation**;
3. users respond to visible signals through **social proof**, **threshold behaviour**, and **attention shortcuts**;
4. platform decisions create feedback loops that shape the next round of data.

The mathematical claim is conditional but strong:

> If a system allocates attention, trust, or money using manipulable proxies, and those proxies can be artificially shifted, then allocation can be artificially shifted when the shift crosses a ranking, recommendation, threshold, or budget boundary.

This folder gives model cards, equations, proof sketches, and safe verification methods.
