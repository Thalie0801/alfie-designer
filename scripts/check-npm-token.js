if (!process.env.NPM_TOKEN) {
  console.error(
    "❌ NPM_TOKEN manquant. Crée un token npm (read) et exporte-le:\n" +
      "   export NPM_TOKEN=xxxx\n" +
      "Ou configure-le dans un .npmrc local //registry.npmjs.org/:_authToken=${NPM_TOKEN}\n"
  );
  process.exit(1);
}
