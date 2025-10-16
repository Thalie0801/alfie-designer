let applyTransform;
try {
  ({ applyTransform } = require('jscodeshift/src/testUtils'));
} catch (error) {
  console.warn(
    '[codex-tests] jscodeshift n\'est pas installé. Les tests du codemod sont ignorés. Exécutez `npx --yes jscodeshift@0.15.2` avant de lancer la suite si vous avez besoin de les valider.'
  );
}

const transform = require('./refonte-codemod');

const describeSuite = applyTransform ? describe : describe.skip;

function run(src) {
  if (!applyTransform) {
    throw new Error('jscodeshift indisponible ; tests codemod ignorés.');
  }
  return applyTransform({ parser: 'ts', transform }, null, { source: src });
}

describeSuite('refonte codemod', () => {
  test('remplace /v1/publish par /v1/creations/:id/deliver', () => {
    const input = `const ENDPOINT = '/v1/publish';`;
    const out = run(input);
    expect(out).toMatch("/v1/creations/:id/deliver");
  });

  test('désactive autopublication (throw)', () => {
    const input = `publishToSocial({ platform: 'ig' });`;
    const out = run(input);
    expect(out).toMatch(/throw new Error\('Auto publication désactivée en V1/);
  });

  test('ajoute requiresPremiumConfirmation si premiumT2V:true', () => {
    const input = `const payload = { premiumT2V: true };`;
    const out = run(input);
    expect(out).toMatch(/requiresPremiumConfirmation\s*:\s*true/);
  });
});
