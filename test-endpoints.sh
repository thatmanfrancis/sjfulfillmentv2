#!/bin/bash

# Test script to verify all new API endpoints are accessible
echo "🔍 Testing new API endpoints..."

# Test 1: Warehouse picking tasks
echo "📦 Testing warehouse picking tasks endpoint..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/warehouse/picking-tasks || echo "❌ Picking tasks endpoint test failed"

# Test 2: Order fulfillment
echo "🚀 Testing order fulfillment endpoint..."
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/orders/test-id/fulfill || echo "❌ Order fulfillment endpoint test failed"

# Test 3: Shipping tracking
echo "🚚 Testing shipping tracking endpoint..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/shipping/tracking/test-tracking || echo "❌ Shipping tracking endpoint test failed"

# Test 4: Commission management
echo "💰 Testing commission management endpoint..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/admin/commissions || echo "❌ Commission endpoint test failed"

echo "✅ API endpoint structure validation complete!"

# Test file existence
echo "📁 Verifying file structure..."

files=(
    "app/warehouse/picking/page.tsx"
    "app/admin/commissions/page.tsx"
    "app/api/warehouse/picking-tasks/route.ts"
    "app/api/orders/[id]/fulfill/route.ts"
    "app/api/shipping/tracking/[trackingNumber]/route.ts"
    "app/api/admin/commissions/route.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

echo "🎯 Implementation verification complete!"