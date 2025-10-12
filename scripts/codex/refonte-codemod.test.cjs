const { test } = require('node:test');
const assert = require('node:assert/strict');

let applyTransform;
let transform;
let hasJscodeshift = true;

try {
  ({ applyTransform } = require('jscodeshift/src/testUtils'));
} catch (error) {
  if (error && error.code === 'MODULE_NOT_FOUND' && error.message.includes("'jscodeshift")) {
    hasJscodeshift = false;
    test('codemod regression suite skipped (jscodeshift indisponible)', { skip: true }, () => {});
  } else {
    throw error;
  }
}

if (hasJscodeshift) {
  transform = require('./refonte-codemod');
  function run(source) {
    return applyTransform({ parser: 'ts', transform }, null, { source });
  }

  test('remplace /v1/publish par /v1/creations/:id/deliver', () => {
    const input = "const ENDPOINT = '/v1/publish';";
    const out = run(input);
    assert.match(out, /\/v1\/creations\/:id\/deliver/);
  });

  test('désactive autopublication (throw)', () => {
    const input = "publishToSocial({ platform: 'ig' });";
    const out = run(input);
    assert.match(out, /throw new Error\('Auto publication désactivée en V1/);
  });

  test('ajoute requiresPremiumConfirmation si premiumT2V:true', () => {
    const input = 'const payload = { premiumT2V: true };';
    const out = run(input);
    assert.match(out, /requiresPremiumConfirmation\s*:\s*true/);
  });
}
