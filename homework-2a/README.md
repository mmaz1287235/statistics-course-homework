# Homework 2A: Encryption, Cryptanalysis and Small Key Spaces

A small browser experiment prepared for Statistics 2026/27, MSc Cybersecurity. It compares Caesar encryption with a deliberately weakened elliptic curve construction and evaluates two different key recovery attacks.

## How to run

Open `index.html` in a current browser. On some browsers Web Crypto requires HTTPS or a local server. The published GitHub Pages site uses HTTPS. No external JavaScript libraries or network requests are needed.

## The experiment

I use the real secp256k1 curve for point multiplication, but limit both the receiver's private scalar and the sender's ephemeral scalar to values between 1 and 4096. Message masking uses SHA-256 blocks and HMAC authentication. This is my own educational construction, not standardized ECIES or a safe way to protect data.

I implement Caesar encryption, decryption and a frequency attack that ranks all 26 possible shifts by a chi-square score. I also use a public key match to recover the restricted ECC private scalar and decrypt the message.

## Corpus and evaluation

The letter counts come from the **Lee Background Corpus**, a collection of 300 English news documents from the Australian Broadcasting Corporation, distributed as `lee_background.cor` in Gensim's test data:

https://github.com/piskvorky/gensim/blob/develop/gensim/test/test_data/lee_background.cor

I use documents 1 to 200 for training and documents 201 to 300 for evaluation. Only A through Z are counted. The evaluation windows were sampled using a deterministic generator with seed 4411. The JavaScript preparation script includes a compatible implementation of the original MT19937 sampling procedure to preserve the existing experiment. Each length contains 500 windows. The archive stores only the 26 letter counts for each window, not the underlying news articles. The Caesar shifts are selected with a JavaScript pseudorandom generator using seed 20261020. This means the displayed 3,500 outcomes can be reproduced offline.

Because evaluation windows can overlap and come from the same news collection, the samples are not fully independent. Wilson intervals are descriptive and should not be interpreted as population-wide guarantees. Results may differ for literary writing, technical prose or short unusual messages.

## Connection to HW1

HW1 used the small curve y² = x³ + 7 modulo 17, with base point (1, 5) of order 9. In HW2A I keep the principle Q = kG but use secp256k1 parameters. I do not change HW1 or the existing HW2.

## Files

`index.html`, `style.css`, `script.js`, `corpus-data.js`, `prepare-corpus.js`. The data file holds frequencies and evaluation count vectors, not article text. The optional preparation tool uses Node.js (JavaScript), not a separate programming language.

For independent regeneration, download the corpus from the source and run `node prepare-corpus.js /path/to/lee_background.cor` using Node.js. This regenerates `corpus-data.js` from the 300 documents with the original sampling procedure. The published website uses the already included data file and requires no regeneration or Node.js installation.
