#!/bin/bash

# Script de test pour valider le flux de génération d'images
# Usage: ./test_generation_flow.sh

set -e

echo "🧪 Test du Flux de Génération d'Images - Alfie Designer"
echo "========================================================"
echo ""

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables (à configurer)
SUPABASE_URL="${SUPABASE_URL:-https://your-project.supabase.co}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-your-anon-key}"
USER_ID="${TEST_USER_ID:-}"
BRAND_ID="${TEST_BRAND_ID:-}"

# Fonction pour afficher les résultats
print_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ $2${NC}"
  else
    echo -e "${RED}❌ $2${NC}"
  fi
}

# Fonction pour afficher les warnings
print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "📋 Configuration"
echo "----------------"
echo "SUPABASE_URL: $SUPABASE_URL"
echo "USER_ID: ${USER_ID:-'Non défini'}"
echo "BRAND_ID: ${BRAND_ID:-'Non défini'}"
echo ""

if [ -z "$USER_ID" ] || [ -z "$BRAND_ID" ]; then
  print_warning "USER_ID et BRAND_ID doivent être définis pour les tests complets"
  echo "Export des variables :"
  echo "  export TEST_USER_ID='uuid-user'"
  echo "  export TEST_BRAND_ID='uuid-brand'"
  echo ""
fi

# Test 1: Vérifier que la table job_queue existe
echo "Test 1: Vérification de la table job_queue"
echo "-------------------------------------------"
if command -v psql &> /dev/null; then
  psql "${DATABASE_URL}" -c "SELECT COUNT(*) FROM job_queue;" &> /dev/null
  print_result $? "Table job_queue existe"
else
  print_warning "psql non disponible, test ignoré"
fi
echo ""

# Test 2: Vérifier que la table media_generations existe
echo "Test 2: Vérification de la table media_generations"
echo "---------------------------------------------------"
if command -v psql &> /dev/null; then
  psql "${DATABASE_URL}" -c "SELECT COUNT(*) FROM media_generations;" &> /dev/null
  print_result $? "Table media_generations existe"
else
  print_warning "psql non disponible, test ignoré"
fi
echo ""

# Test 3: Vérifier que le trigger existe
echo "Test 3: Vérification du trigger de synchronisation"
echo "---------------------------------------------------"
if command -v psql &> /dev/null; then
  TRIGGER_EXISTS=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'trigger_sync_job_to_media';")
  if [ "$TRIGGER_EXISTS" -gt 0 ]; then
    print_result 0 "Trigger trigger_sync_job_to_media existe"
  else
    print_result 1 "Trigger trigger_sync_job_to_media n'existe pas"
  fi
else
  print_warning "psql non disponible, test ignoré"
fi
echo ""

# Test 4: Vérifier que la fonction generate-media est déployée
echo "Test 4: Vérification de la fonction generate-media"
echo "---------------------------------------------------"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${SUPABASE_URL}/functions/v1/generate-media" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}')

if [ "$RESPONSE" -eq 400 ] || [ "$RESPONSE" -eq 401 ]; then
  print_result 0 "Fonction generate-media est accessible (HTTP $RESPONSE)"
else
  print_result 1 "Fonction generate-media retourne HTTP $RESPONSE"
fi
echo ""

# Test 5: Vérifier que la fonction track-job-status est déployée
echo "Test 5: Vérification de la fonction track-job-status"
echo "-----------------------------------------------------"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  "${SUPABASE_URL}/functions/v1/track-job-status")

if [ "$RESPONSE" -eq 400 ]; then
  print_result 0 "Fonction track-job-status est accessible (HTTP $RESPONSE)"
else
  print_result 1 "Fonction track-job-status retourne HTTP $RESPONSE"
fi
echo ""

# Test 6: Test d'intégration complet (si USER_ID et BRAND_ID sont définis)
if [ -n "$USER_ID" ] && [ -n "$BRAND_ID" ]; then
  echo "Test 6: Test d'intégration complet"
  echo "-----------------------------------"
  
  # Appeler generate-media
  RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/generate-media" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\": \"${USER_ID}\",
      \"brandId\": \"${BRAND_ID}\",
      \"kind\": \"image\",
      \"count\": 1,
      \"ratio\": \"1:1\",
      \"prompt\": \"Test de génération d'image\"
    }")
  
  JOB_ID=$(echo "$RESPONSE" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
  
  if [ -n "$JOB_ID" ]; then
    print_result 0 "Job créé avec succès (ID: $JOB_ID)"
    
    # Attendre quelques secondes
    echo "   Attente de 5 secondes pour le traitement..."
    sleep 5
    
    # Vérifier dans job_queue
    if command -v psql &> /dev/null; then
      JOB_STATUS=$(psql "${DATABASE_URL}" -t -c "SELECT status FROM job_queue WHERE id = '${JOB_ID}';")
      echo "   Statut du job: ${JOB_STATUS}"
      
      # Vérifier dans media_generations
      MEDIA_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM media_generations WHERE job_id = '${JOB_ID}';")
      if [ "$MEDIA_COUNT" -gt 0 ]; then
        print_result 0 "Entrée créée dans media_generations"
      else
        print_result 1 "Aucune entrée dans media_generations"
      fi
    fi
  else
    print_result 1 "Échec de la création du job"
    echo "   Réponse: $RESPONSE"
  fi
else
  print_warning "Test 6 ignoré (USER_ID et BRAND_ID non définis)"
fi
echo ""

# Test 7: Vérifier l'index de performance
echo "Test 7: Vérification des index"
echo "-------------------------------"
if command -v psql &> /dev/null; then
  INDEX_EXISTS=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'idx_media_generations_job_output';")
  if [ "$INDEX_EXISTS" -gt 0 ]; then
    print_result 0 "Index idx_media_generations_job_output existe"
  else
    print_result 1 "Index idx_media_generations_job_output n'existe pas"
  fi
else
  print_warning "psql non disponible, test ignoré"
fi
echo ""

echo "========================================================"
echo "✅ Tests terminés"
echo ""
echo "Pour un test complet, assurez-vous de :"
echo "1. Définir les variables TEST_USER_ID et TEST_BRAND_ID"
echo "2. Avoir accès à la base de données via psql"
echo "3. Avoir déployé toutes les fonctions Edge"
echo "4. Avoir appliqué toutes les migrations"
