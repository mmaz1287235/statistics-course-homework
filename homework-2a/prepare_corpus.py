"""Recreate corpus-data.js from a locally obtained Lee Background Corpus.

Source: https://github.com/piskvorky/gensim/blob/develop/gensim/test/test_data/lee_background.cor
Run: python prepare_corpus.py /path/to/lee_background.cor
No copyrighted source articles are included in this homework archive.
"""
import json
import random
import re
import sys
from pathlib import Path


def letter_counts(text):
    return [text.count(chr(65 + index)) for index in range(26)]


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python prepare_corpus.py /path/to/lee_background.cor")
    original = Path(sys.argv[1]).read_text(encoding="latin-1")
    documents = [re.sub("[^A-Z]", "", line.upper()) for line in original.splitlines() if line.strip()]
    if len(documents) != 300:
        raise SystemExit(f"Expected 300 documents, found {len(documents)}")
    training = "".join(documents[:200])
    evaluation = "".join(documents[200:])
    lengths = [10, 25, 50, 100, 250, 500, 1000]
    randomizer = random.Random(4411)
    windows = {}
    for length in lengths:
        windows[str(length)] = [
            letter_counts(evaluation[start:start + length])
            for start in (randomizer.randrange(len(evaluation) - length + 1) for _ in range(500))
        ]
    payload = {
        "name": "Lee Background Corpus, 300 ABC news documents",
        "source": "https://github.com/piskvorky/gensim/blob/develop/gensim/test/test_data/lee_background.cor",
        "trainingDocuments": 200, "evaluationDocuments": 100,
        "trainingLetters": len(training), "evaluationLetters": len(evaluation),
        "trainingCounts": letter_counts(training), "lengths": lengths, "windows": windows,
    }
    output = Path(__file__).parent / "corpus-data.js"
    output.write_text(
        "/* Letter-count summaries from English news documents, not reproduced text. */\n"
        + "const CORPUS_DATA = " + json.dumps(payload, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"Saved {output}. Training letters: {len(training)}; evaluation letters: {len(evaluation)}")


if __name__ == "__main__":
    main()
