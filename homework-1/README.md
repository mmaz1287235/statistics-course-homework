# Homework 1: Private Key to Public Key in Ethereum

This page presents a small, interactive example of elliptic-curve scalar multiplication. It uses the finite-field curve y² = x³ + 7 (mod 17) with G = (1, 5), following the assignment. The default private key k = 6 produces Q = (5, 8).

The experiment shows the intermediate point additions and includes an optional slow animation. A second section examines the full cycle of G, coordinate frequencies, and 5-bit representations and Hamming distances between consecutive outputs. The discussion explains why these observations do not establish cryptographic security or imply the avalanche property of a cryptographic hash function.

Open `index.html` in a browser. `script.js` and `style.css` must remain in the same folder. No libraries or network connection are required.

The implementation is for teaching only. It does not implement real secp256k1 key generation or generate a working Ethereum wallet.
