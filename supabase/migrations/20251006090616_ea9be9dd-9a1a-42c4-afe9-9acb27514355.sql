-- Mettre à jour les price_ids Stripe dans la table credit_packs
UPDATE credit_packs 
SET stripe_price_id = 'price_1SFALZQvcbGhgt8SY6CQqhae'
WHERE name = 'Pack 20 crédits';

UPDATE credit_packs 
SET stripe_price_id = 'price_1SFALlQvcbGhgt8STrUXcmMJ'
WHERE name = 'Pack 50 crédits';

UPDATE credit_packs 
SET stripe_price_id = 'price_1SFALzQvcbGhgt8SjFhMWJnU'
WHERE name = 'Pack 100 crédits';

UPDATE credit_packs 
SET stripe_price_id = 'price_1SFAMDQvcbGhgt8SKigE7jta'
WHERE name = 'Pack 500 crédits';