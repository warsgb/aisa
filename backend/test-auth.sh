#!/bin/bash
# Test authentication and endpoints

echo "=== AISA Backend Authentication Test ==="
echo ""

API_URL="http://localhost:3001"

echo "1. Testing health endpoint..."
curl -s "$API_URL/health" | head -3
echo ""

echo "2. Testing login with 1@1.com (user: gb)..."
# Login as the user (password: password123)
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"1@1.com","password":"password123"}')

echo "$LOGIN_RESPONSE" | head -5

# Extract the access token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -oP '"access_token":"[^"]*' | cut -d'"' -f2)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Login failed or token not found"
  exit 1
fi

echo "✅ Got access token: ${ACCESS_TOKEN:0:50}..."
echo ""

echo "3. Testing /auth/me with valid token..."
ME_RESPONSE=$(curl -s "$API_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$ME_RESPONSE" | head -5
echo ""

echo "4. Testing /teams/b4c93a1b-09d2-4224-a851-abac42603e33/documents..."
DOCS_RESPONSE=$(curl -s "$API_URL/teams/b4c93a1b-09d2-4224-a851-abac42603e33/documents" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$DOCS_RESPONSE" | head -5
echo ""

echo "5. Full /auth/me response:"
curl -s "$API_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.' 2>/dev/null || echo "$ME_RESPONSE"

echo ""
echo "=== Logs ==="
echo "Check backend logs at: /home/presales/aisa/backend/logs/backend.log"
echo "Run: tail -f /home/presales/aisa/backend/logs/backend.log"
