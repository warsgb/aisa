#!/bin/bash
# Generate secure random secrets for AISA application

echo "🔐 AISA Secret Key Generator"
echo "=============================="
echo ""

# Check if openssl is available
if ! command -v openssl >/dev/null 2>&1; then
    echo "❌ Error: openssl is required but not installed."
    echo "   Install with: brew install openssl (macOS) or apt install openssl (Linux)"
    exit 1
fi

# Generate secrets
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

echo "Generated secure keys:"
echo ""
echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo ""
echo "=============================="
echo ""
echo "Add these to your backend/.env file:"
echo ""
cat <<EOF
# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_REFRESH_EXPIRES_IN=7d
EOF
echo ""
echo "💡 Tip: Save these keys securely. Do not commit them to git."
echo ""
