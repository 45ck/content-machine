#!/usr/bin/env python3
"""Extract DistilBERT text embeddings from transcript/caption text.

Usage:
    python text_embeddings.py --text "Hello world"
    python text_embeddings.py --file transcript.txt

Output: JSON with 768-dim embedding vector (mean-pooled).
"""
import argparse
import json
import sys
from typing import Any, Dict, List


def _fail(message: str, details: Dict[str, Any] | None = None) -> None:
    payload: Dict[str, Any] = {"error": {"message": message}}
    if details:
        payload["error"]["details"] = details
    print(json.dumps(payload))
    raise SystemExit(2)


def _compute_embedding(text: str) -> List[float]:
    try:
        from transformers import AutoTokenizer, AutoModel
        import torch
    except ImportError:
        _fail("Missing dependencies: pip install transformers torch")

    model_name = "distilbert-base-uncased"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name)
    model.eval()

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=512,
        padding=True,
    )

    with torch.no_grad():
        outputs = model(**inputs)

    # Mean pool over token dimension (ignoring padding)
    attention_mask = inputs["attention_mask"].unsqueeze(-1)
    token_embeddings = outputs.last_hidden_state
    summed = (token_embeddings * attention_mask).sum(dim=1)
    count = attention_mask.sum(dim=1).clamp(min=1)
    embedding = (summed / count).squeeze(0).tolist()

    return embedding


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract DistilBERT text embeddings")
    parser.add_argument("--text", type=str, help="Input text string")
    parser.add_argument("--file", type=str, help="Path to text file")
    args = parser.parse_args()

    if args.text:
        text = args.text
    elif args.file:
        try:
            with open(args.file, "r", encoding="utf-8") as f:
                text = f.read().strip()
        except FileNotFoundError:
            _fail(f"File not found: {args.file}")
            return
    else:
        _fail("Provide --text or --file argument")
        return

    if not text:
        _fail("Empty text input")
        return

    embedding = _compute_embedding(text)

    print(json.dumps({
        "embedding": embedding,
        "dim": len(embedding),
        "model": "distilbert-base-uncased",
    }))


if __name__ == "__main__":
    main()
