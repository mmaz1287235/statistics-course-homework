'use strict';
/* Regenerate corpus-data.js with Node.js, without Python dependencies.
 * Reproduces the original CPython Random(4411).randrange(...) sampling stream.
 * Usage: node prepare-corpus.js /path/to/lee_background.cor
 */
const fs = require('node:fs');
const path = require('node:path');

// MT19937 seeding and getrandbits, matching CPython's random.Random for
// a nonnegative integer seed. All arithmetic is unsigned 32-bit.
class PythonRandom {
  constructor(seed) {
    this.mt = new Uint32Array(624);
    this.index = 624;
    this.initGenrand(19650218);
    const key = [];
    do { key.push(seed >>> 0); seed = Math.floor(seed / 4294967296); } while (seed > 0);
    let i = 1, j = 0, k = Math.max(624, key.length);
    for (; k > 0; k--) {
      const x = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      this.mt[i] = (this.mt[i] ^ Math.imul(x, 1664525)) + key[j] + j;
      this.mt[i] >>>= 0;
      i++; j++;
      if (i >= 624) { this.mt[0] = this.mt[623]; i = 1; }
      if (j >= key.length) j = 0;
    }
    for (k = 623; k > 0; k--) {
      const x = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      this.mt[i] = (this.mt[i] ^ Math.imul(x, 1566083941)) - i;
      this.mt[i] >>>= 0;
      i++;
      if (i >= 624) { this.mt[0] = this.mt[623]; i = 1; }
    }
    this.mt[0] = 0x80000000;
  }
  initGenrand(seed) {
    this.mt[0] = seed >>> 0;
    for (let i = 1; i < 624; i++) {
      const x = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      this.mt[i] = (Math.imul(1812433253, x) + i) >>> 0;
    }
  }
  nextUint32() {
    if (this.index >= 624) {
      for (let i = 0; i < 624; i++) {
        const y = (this.mt[i] & 0x80000000) | (this.mt[(i + 1) % 624] & 0x7fffffff);
        this.mt[i] = this.mt[(i + 397) % 624] ^ (y >>> 1) ^ ((y & 1) ? 0x9908b0df : 0);
      }
      this.index = 0;
    }
    let y = this.mt[this.index++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }
  getrandbits(k) {
    if (!Number.isInteger(k) || k < 0 || k > 32) throw Error('Invalid bit count');
    return k === 0 ? 0 : this.nextUint32() >>> (32 - k);
  }
  randbelow(n) {
    if (!Number.isSafeInteger(n) || n <= 0 || n > 0xffffffff) throw Error('Invalid range');
    const bits = 32 - Math.clz32(n);
    let r;
    do { r = this.getrandbits(bits); } while (r >= n);
    return r;
  }
}

function letterCounts(text) {
  const result = Array(26).fill(0);
  for (let i = 0; i < text.length; i++) result[text.charCodeAt(i) - 65]++;
  return result;
}

function main() {
  if (process.argv.length !== 3) {
    console.error('Usage: node prepare-corpus.js /path/to/lee_background.cor');
    process.exitCode = 1;
    return;
  }
  // latin1 matches the decoding used to prepare the original dataset.
  const original = fs.readFileSync(process.argv[2], 'latin1');
  const documents = original.split(/\r\n|\n|\r/).filter(line => line.trim()).map(line => line.toUpperCase().replace(/[^A-Z]/g, ''));
  if (documents.length !== 300) throw Error(`Expected 300 documents, found ${documents.length}`);
  const training = documents.slice(0, 200).join('');
  const evaluation = documents.slice(200).join('');
  const lengths = [10, 25, 50, 100, 250, 500, 1000];
  const randomizer = new PythonRandom(4411);
  const windows = {};
  for (const length of lengths) {
    const samples = [];
    for (let trial = 0; trial < 500; trial++) {
      const start = randomizer.randbelow(evaluation.length - length + 1);
      samples.push(letterCounts(evaluation.slice(start, start + length)));
    }
    windows[String(length)] = samples;
  }
  const payload = {
    name: 'Lee Background Corpus, 300 ABC news documents',
    source: 'https://github.com/piskvorky/gensim/blob/develop/gensim/test/test_data/lee_background.cor',
    trainingDocuments: 200, evaluationDocuments: 100,
    trainingLetters: training.length, evaluationLetters: evaluation.length,
    trainingCounts: letterCounts(training), lengths, windows
  };
  const output = path.join(__dirname, 'corpus-data.js');
  fs.writeFileSync(output, '/* Letter-count summaries from English news documents, not reproduced text. */\n' +
    'const CORPUS_DATA = ' + JSON.stringify(payload) + ';\n', 'utf8');
  console.log(`Saved ${output}. Training letters: ${training.length}; evaluation letters: ${evaluation.length}`);
}
if (require.main === module) main();
module.exports = { PythonRandom, letterCounts };
