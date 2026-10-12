# Statistics 2026/2027 — Homework 2

From Wallet Seed to Ethereum Address: Hashing, Key Derivation and Cryptographic Primitives.

## Running the page

Open `index.html` in a modern browser. The demonstration needs Web Crypto (available in secure browser contexts, including local files in most browsers). All source files are local, with no external JavaScript dependencies. Nothing is sent to a server.

Use the **Run derivation** button to evaluate the public BIP-39 phrase `abandon` (11 times) followed by `about`, with an empty passphrase. The Ethereum key path is `m/44'/60'/0'/0/0`. The expected lowercase address is `0x9858effd232b4033e47d90003d41ec34ecaeda94`.

A separate comparison displays the fixed Keccak-256 and SHA3-256 digests of the empty byte string and their Hamming distance. The displayed idealized reference of 50% for hash output changes is not a security proof.

The statistical section has separate buttons for hash output changes and the EIP-55 checksum substitution experiment. Hash trials are deterministic and use the first 16, 32 or 64 bits of a fixed 32 byte input. EIP-55 trials are randomized using the browser's cryptographic random number generator, so the counts vary between runs.

## Design and limitations

BIP-39 PBKDF2 and BIP-32 HMAC use the Web Crypto API. The page includes a compact implementation of secp256k1 scalar multiplication and Keccak for explanatory purposes. Their outputs are compared against known values, but the implementation is neither audited nor protected against timing attacks. Never adapt it for actual wallet credentials or transaction signing.

The fixed mnemonic is publicly known and unsafe for holding funds. Do not paste a personal recovery phrase into any demo. This page deliberately has no input for user secrets.

The mnemonic entropy table contains theoretical values. Hash results are measurements over chosen bit changes and are not proofs of cryptographic security. EIP-55 detection results apply to the selected mutation model, not to all input errors.

## Manual verification checklist

- Open the page and check the console for JavaScript errors.
- Click **Run derivation** and confirm the displayed address equals `0x9858effd232b4033e47d90003d41ec34ecaeda94` when case is ignored.
- Run all three statistical options and confirm counts, labels and charts update.
- Resize to a narrow mobile viewport and confirm all hexadecimal values wrap.
- Open the specification links and verify they lead to the expected documents.
- Test GitHub Pages only after local review. Do not change Homework 1.

## References

The primary specification links appear at the end of the HTML page. The code was designed to support the assignment, not to replace official wallet software.

## Wallet demonstration scope

The page reproduces a public wallet derivation with test data. It does not claim that MetaMask, Rabby or another wallet was opened or tested. Wallet interfaces typically expose account addresses and phrase recovery, but not every intermediate computation.
